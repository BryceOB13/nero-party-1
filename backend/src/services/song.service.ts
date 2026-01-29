import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import {
  Song,
  SongSubmission,
  PartyStatus,
  Round,
  AppError,
  ClientErrorCode,
} from '../types';

/**
 * SongService handles song submissions and playback queue management.
 * 
 * **Validates: Requirements 4.3, 4.4, 4.5, 4.6**
 */
export class SongService {
  /**
   * Submits a song to a party with validation.
   * 
   * **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 14.2, 14.5**
   * - 4.3: WHEN a Player submits a song, THE Backend SHALL validate they have not exceeded the songs_per_player limit
   * - 4.4: WHEN a Player submits a song, THE Backend SHALL require them to set a Confidence level between 1 and 5
   * - 4.5: WHEN a song is submitted, THE Backend SHALL store the SoundCloud track_id, title, artist, submitter_id, confidence, and round_assignment
   * - 4.6: WHEN a Player submits song N, THE Backend SHALL assign it to Round N
   * - 14.2: WHEN a Player attempts to submit more songs than allowed, THE Backend SHALL return an error with the message "Song limit reached"
   * - 14.5: WHEN validation fails, THE Backend SHALL return specific error messages indicating which field is invalid
   * 
   * @param partyId - The party's unique ID
   * @param playerId - The ID of the player submitting the song
   * @param songData - The song submission data
   * @returns The created song
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if player does not exist (PLAYER_NOT_FOUND)
   * @throws AppError if party is not in SUBMITTING state (INVALID_STATE)
   * @throws AppError if player has exceeded song limit (SONG_LIMIT_REACHED)
   * @throws AppError if confidence is invalid (INVALID_CONFIDENCE)
   * @throws AppError if player does not belong to party (PLAYER_NOT_IN_PARTY)
   */
  async submitSong(
    partyId: string,
    playerId: string,
    songData: SongSubmission
  ): Promise<Song> {
    // Get the party
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get the player
    const playerRecord = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!playerRecord) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_FOUND, 'Player does not exist');
    }

    // Verify player belongs to this party
    if (playerRecord.partyId !== partyId) {
      throw new AppError(ClientErrorCode.PLAYER_NOT_IN_PARTY, 'Player does not belong to this party');
    }

    // Verify party is in SUBMITTING state
    if (partyRecord.status !== PartyStatus.SUBMITTING) {
      throw new AppError(ClientErrorCode.INVALID_STATE, 'Songs can only be submitted during SUBMITTING phase');
    }

    // Requirement 4.4 / 14.5: Validate confidence level is between 1 and 5
    if (!this.isValidConfidence(songData.confidence)) {
      throw new AppError(
        ClientErrorCode.INVALID_CONFIDENCE,
        'Confidence must be between 1 and 5',
        'confidence'
      );
    }

    // Get party settings
    const settings = JSON.parse(partyRecord.settings);
    const songsPerPlayer = settings.songsPerPlayer || 2;

    // Requirement 4.3 / 14.2: Check if player has exceeded songs_per_player limit
    const existingSongs = await prisma.song.count({
      where: {
        partyId,
        submitterId: playerId,
      },
    });

    if (existingSongs >= songsPerPlayer) {
      throw new AppError(ClientErrorCode.SONG_LIMIT_REACHED, 'Song limit reached');
    }

    // Requirement 4.6: Assign song to round N for player's Nth submission
    // The round number is the next submission number (1-indexed)
    const roundNumber = existingSongs + 1;

    // Requirement 4.5: Store complete song data in database
    const songId = uuidv4();
    const songRecord = await prisma.song.create({
      data: {
        id: songId,
        partyId,
        submitterId: playerId,
        soundcloudId: songData.soundcloudId,
        title: songData.title,
        artist: songData.artist,
        artworkUrl: songData.artworkUrl,
        duration: songData.duration,
        permalinkUrl: songData.permalinkUrl,
        confidence: songData.confidence,
        roundNumber,
        queuePosition: 0, // Will be set when organizing into rounds
      },
    });

    // Convert to typed interface (convert BigInt to Number for JSON serialization)
    const song: Song = {
      id: songRecord.id,
      partyId: songRecord.partyId,
      submitterId: songRecord.submitterId,
      soundcloudId: Number(songRecord.soundcloudId),
      title: songRecord.title,
      artist: songRecord.artist,
      artworkUrl: songRecord.artworkUrl,
      duration: songRecord.duration,
      permalinkUrl: songRecord.permalinkUrl,
      confidence: songRecord.confidence as 1 | 2 | 3 | 4 | 5,
      roundNumber: songRecord.roundNumber,
      queuePosition: songRecord.queuePosition,
      rawAverage: songRecord.rawAverage,
      weightedScore: songRecord.weightedScore,
      confidenceModifier: songRecord.confidenceModifier,
      finalScore: songRecord.finalScore,
      voteDistribution: songRecord.voteDistribution 
        ? JSON.parse(songRecord.voteDistribution) 
        : null,
      submittedAt: songRecord.submittedAt,
    };

    return song;
  }

  /**
   * Validates that confidence is between 1 and 5 (inclusive).
   * 
   * **Validates: Requirements 4.4**
   * 
   * @param confidence - The confidence value to validate
   * @returns true if valid, false otherwise
   */
  private isValidConfidence(confidence: number): confidence is 1 | 2 | 3 | 4 | 5 {
    return Number.isInteger(confidence) && confidence >= 1 && confidence <= 5;
  }

  /**
   * Gets a single song by ID.
   * 
   * @param songId - The song's unique ID
   * @returns The song if found, null otherwise
   */
  async getSong(songId: string): Promise<Song | null> {
    const songRecord = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!songRecord) {
      return null;
    }

    return {
      id: songRecord.id,
      partyId: songRecord.partyId,
      submitterId: songRecord.submitterId,
      soundcloudId: Number(songRecord.soundcloudId),
      title: songRecord.title,
      artist: songRecord.artist,
      artworkUrl: songRecord.artworkUrl,
      duration: songRecord.duration,
      permalinkUrl: songRecord.permalinkUrl,
      confidence: songRecord.confidence as 1 | 2 | 3 | 4 | 5,
      roundNumber: songRecord.roundNumber,
      queuePosition: songRecord.queuePosition,
      rawAverage: songRecord.rawAverage,
      weightedScore: songRecord.weightedScore,
      confidenceModifier: songRecord.confidenceModifier,
      finalScore: songRecord.finalScore,
      voteDistribution: songRecord.voteDistribution 
        ? JSON.parse(songRecord.voteDistribution) 
        : null,
      submittedAt: songRecord.submittedAt,
    };
  }

  /**
   * Gets all songs for a party.
   * 
   * @param partyId - The party's unique ID
   * @returns Array of songs
   */
  async getSongs(partyId: string): Promise<Song[]> {
    const songRecords = await prisma.song.findMany({
      where: { partyId },
      orderBy: [
        { roundNumber: 'asc' },
        { queuePosition: 'asc' },
      ],
    });

    return songRecords.map(record => ({
      id: record.id,
      partyId: record.partyId,
      submitterId: record.submitterId,
      soundcloudId: Number(record.soundcloudId),
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
      voteDistribution: record.voteDistribution 
        ? JSON.parse(record.voteDistribution) 
        : null,
      submittedAt: record.submittedAt,
    }));
  }

  /**
   * Gets all songs submitted by a specific player.
   * 
   * @param partyId - The party's unique ID
   * @param playerId - The player's unique ID
   * @returns Array of songs submitted by the player
   */
  async getPlayerSongs(partyId: string, playerId: string): Promise<Song[]> {
    const songRecords = await prisma.song.findMany({
      where: { 
        partyId,
        submitterId: playerId,
      },
      orderBy: { roundNumber: 'asc' },
    });

    return songRecords.map(record => ({
      id: record.id,
      partyId: record.partyId,
      submitterId: record.submitterId,
      soundcloudId: Number(record.soundcloudId),
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
      voteDistribution: record.voteDistribution 
        ? JSON.parse(record.voteDistribution) 
        : null,
      submittedAt: record.submittedAt,
    }));
  }

  /**
   * Gets the count of songs submitted by a player.
   * 
   * @param partyId - The party's unique ID
   * @param playerId - The player's unique ID
   * @returns The number of songs submitted
   */
  async getPlayerSongCount(partyId: string, playerId: string): Promise<number> {
    return prisma.song.count({
      where: {
        partyId,
        submitterId: playerId,
      },
    });
  }

  /**
   * Removes a song from a party.
   * 
   * @param songId - The song's unique ID
   * @param playerId - The ID of the player requesting removal
   * @throws Error if song does not exist (SONG_NOT_FOUND)
   * @throws Error if player is not the submitter (NOT_SUBMITTER)
   */
  async removeSong(songId: string, playerId: string): Promise<void> {
    const songRecord = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!songRecord) {
      throw new AppError(ClientErrorCode.SONG_NOT_FOUND, 'Song does not exist');
    }

    if (songRecord.submitterId !== playerId) {
      throw new AppError(ClientErrorCode.NOT_SUBMITTER, 'Only the submitter can remove this song');
    }

    await prisma.song.delete({
      where: { id: songId },
    });
  }

  /**
   * Calculates the weight multiplier for a round based on round position and total rounds.
   * 
   * **Validates: Requirements 6.2, 6.3, 6.4**
   * - Property 25: For songs_per_player = 1, all songs have 1.5x multiplier
   * - Property 26: For songs_per_player = 2, round 1 = 1.0x, round 2 = 2.0x
   * - Property 27: For songs_per_player = 3, round 1 = 1.0x, round 2 = 1.5x, round 3 = 2.0x
   * 
   * @param roundNumber - The round number (1-indexed)
   * @param totalRounds - The total number of rounds (same as songs_per_player)
   * @returns The weight multiplier for the round
   */
  getWeightMultiplier(roundNumber: number, totalRounds: number): number {
    // Property 25: For songs_per_player = 1, all songs have 1.5x multiplier
    if (totalRounds === 1) {
      return 1.5;
    }

    // Property 26: For songs_per_player = 2, round 1 = 1.0x, round 2 = 2.0x
    if (totalRounds === 2) {
      return roundNumber === 1 ? 1.0 : 2.0;
    }

    // Property 27: For songs_per_player = 3, round 1 = 1.0x, round 2 = 1.5x, round 3 = 2.0x
    if (totalRounds === 3) {
      if (roundNumber === 1) return 1.0;
      if (roundNumber === 2) return 1.5;
      return 2.0;
    }

    // Default fallback for unexpected values
    return 1.0;
  }

  /**
   * Fisher-Yates shuffle algorithm for randomizing array order.
   * Creates a new shuffled array without modifying the original.
   * 
   * @param array - The array to shuffle
   * @returns A new shuffled array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Organizes songs into rounds for playback.
   * 
   * **Validates: Requirements 5.1, 5.2**
   * - 5.1: WHEN the Party transitions to PLAYING, THE Backend SHALL organize songs into Rounds 
   *        where each Round contains one song from each Player
   * - 5.2: WHEN a Round is created, THE Backend SHALL shuffle the song order within that Round
   * 
   * This method:
   * 1. Gets all songs for the party
   * 2. Groups them by roundNumber
   * 3. Shuffles songs within each round (Fisher-Yates)
   * 4. Calculates weight multiplier based on round position and total rounds
   * 5. Updates queuePosition for each song in the database
   * 6. Returns array of Round objects
   * 
   * @param partyId - The party's unique ID
   * @returns Array of Round objects with shuffled songs and weight multipliers
   * @throws Error if party does not exist (PARTY_NOT_FOUND)
   */
  async organizeIntoRounds(partyId: string): Promise<Round[]> {
    // Get the party to determine settings
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get party settings to determine total rounds
    const settings = JSON.parse(partyRecord.settings);
    const totalRounds = settings.songsPerPlayer || 2;

    // Get all songs for the party
    const songRecords = await prisma.song.findMany({
      where: { partyId },
      orderBy: { roundNumber: 'asc' },
    });

    // Group songs by round number
    const songsByRound = new Map<number, Song[]>();
    
    for (const record of songRecords) {
      const song: Song = {
        id: record.id,
        partyId: record.partyId,
        submitterId: record.submitterId,
        soundcloudId: Number(record.soundcloudId),
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
        voteDistribution: record.voteDistribution 
          ? JSON.parse(record.voteDistribution) 
          : null,
        submittedAt: record.submittedAt,
      };

      const roundSongs = songsByRound.get(song.roundNumber) || [];
      roundSongs.push(song);
      songsByRound.set(song.roundNumber, roundSongs);
    }

    // Build rounds array with shuffled songs and weight multipliers
    const rounds: Round[] = [];
    let globalQueuePosition = 1;

    // Process rounds in order
    const roundNumbers = Array.from(songsByRound.keys()).sort((a, b) => a - b);

    for (const roundNumber of roundNumbers) {
      const roundSongs = songsByRound.get(roundNumber) || [];
      
      // Requirement 5.2: Shuffle songs within each round
      const shuffledSongs = this.shuffleArray(roundSongs);

      // Update queue positions for shuffled songs
      const songsWithPositions: Song[] = [];
      for (const song of shuffledSongs) {
        // Update the song's queue position in the database
        await prisma.song.update({
          where: { id: song.id },
          data: { queuePosition: globalQueuePosition },
        });

        // Update the song object with the new queue position
        songsWithPositions.push({
          ...song,
          queuePosition: globalQueuePosition,
        });

        globalQueuePosition++;
      }

      // Calculate weight multiplier for this round
      const weightMultiplier = this.getWeightMultiplier(roundNumber, totalRounds);

      // Create the round object
      const round: Round = {
        roundNumber,
        songs: songsWithPositions,
        weightMultiplier,
        isComplete: false,
      };

      rounds.push(round);
    }

    return rounds;
  }

  /**
   * Shuffles songs within a specific round.
   * 
   * @param partyId - The party's unique ID
   * @param roundNumber - The round number to shuffle
   * @returns Array of shuffled songs with updated queue positions
   * @throws Error if party does not exist (PARTY_NOT_FOUND)
   */
  async shuffleRound(partyId: string, roundNumber: number): Promise<Song[]> {
    // Get the party
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Get songs for this round
    const songRecords = await prisma.song.findMany({
      where: { 
        partyId,
        roundNumber,
      },
    });

    // Convert to Song objects
    const songs: Song[] = songRecords.map(record => ({
      id: record.id,
      partyId: record.partyId,
      submitterId: record.submitterId,
      soundcloudId: Number(record.soundcloudId),
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
      voteDistribution: record.voteDistribution 
        ? JSON.parse(record.voteDistribution) 
        : null,
      submittedAt: record.submittedAt,
    }));

    // Shuffle the songs
    const shuffledSongs = this.shuffleArray(songs);

    // Calculate the starting queue position for this round
    // Get the minimum queue position from songs in previous rounds
    const previousRoundSongs = await prisma.song.findMany({
      where: {
        partyId,
        roundNumber: { lt: roundNumber },
      },
      orderBy: { queuePosition: 'desc' },
      take: 1,
    });

    let startPosition = 1;
    if (previousRoundSongs.length > 0) {
      startPosition = previousRoundSongs[0].queuePosition + 1;
    }

    // Update queue positions
    const updatedSongs: Song[] = [];
    for (let i = 0; i < shuffledSongs.length; i++) {
      const newPosition = startPosition + i;
      
      await prisma.song.update({
        where: { id: shuffledSongs[i].id },
        data: { queuePosition: newPosition },
      });

      updatedSongs.push({
        ...shuffledSongs[i],
        queuePosition: newPosition,
      });
    }

    return updatedSongs;
  }

  /**
   * Gets the next song to play in the party queue.
   * 
   * @param partyId - The party's unique ID
   * @returns The next song to play, or null if no songs remain
   */
  async getNextSong(partyId: string): Promise<Song | null> {
    // Get the song with the lowest queue position that hasn't been played yet
    // We determine "played" by checking if the song has a finalScore set
    const songRecord = await prisma.song.findFirst({
      where: {
        partyId,
        finalScore: null, // Song hasn't been scored yet (not played)
      },
      orderBy: { queuePosition: 'asc' },
    });

    if (!songRecord) {
      return null;
    }

    return {
      id: songRecord.id,
      partyId: songRecord.partyId,
      submitterId: songRecord.submitterId,
      soundcloudId: Number(songRecord.soundcloudId),
      title: songRecord.title,
      artist: songRecord.artist,
      artworkUrl: songRecord.artworkUrl,
      duration: songRecord.duration,
      permalinkUrl: songRecord.permalinkUrl,
      confidence: songRecord.confidence as 1 | 2 | 3 | 4 | 5,
      roundNumber: songRecord.roundNumber,
      queuePosition: songRecord.queuePosition,
      rawAverage: songRecord.rawAverage,
      weightedScore: songRecord.weightedScore,
      confidenceModifier: songRecord.confidenceModifier,
      finalScore: songRecord.finalScore,
      voteDistribution: songRecord.voteDistribution 
        ? JSON.parse(songRecord.voteDistribution) 
        : null,
      submittedAt: songRecord.submittedAt,
    };
  }
}

// Export singleton instance
export const songService = new SongService();
