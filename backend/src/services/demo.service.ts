import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import {
  Party,
  Player,
  Song,
  Vote,
  PartyStatus,
  PlayerStatus,
  PartySettings,
  DEFAULT_PARTY_SETTINGS,
  DemoTrack,
  VoterPersonality,
  DemoTimingConfig,
  DEMO_PERSONALITIES,
  DEMO_TIMING_CONFIG,
} from '../types';
import { identityService } from './identity.service';

/**
 * Demo player names for simulated players.
 * These are used when creating demo parties with 4 simulated players.
 * 
 * **Validates: Requirements 9.1**
 */
const DEMO_PLAYER_NAMES = [
  'Demo Alex',
  'Demo Blake',
  'Demo Casey',
  'Demo Drew',
];

/**
 * Curated demo playlist with tracks for demonstration.
 * These tracks are auto-submitted in demo mode.
 * 
 * **Validates: Requirements 9.2**
 * 
 * Note: These are placeholder SoundCloud IDs. In production,
 * these should be replaced with actual curated track IDs.
 */
const DEMO_PLAYLIST: DemoTrack[] = [
  {
    soundcloudId: 1001,
    title: 'Summer Vibes',
    artist: 'Demo Artist 1',
    artworkUrl: 'https://via.placeholder.com/500x500?text=Summer+Vibes',
    duration: 180000,
    permalinkUrl: 'https://soundcloud.com/demo/summer-vibes',
    expectedScore: 7.5,
  },
  {
    soundcloudId: 1002,
    title: 'Midnight Drive',
    artist: 'Demo Artist 2',
    artworkUrl: 'https://via.placeholder.com/500x500?text=Midnight+Drive',
    duration: 210000,
    permalinkUrl: 'https://soundcloud.com/demo/midnight-drive',
    expectedScore: 8.0,
  },
  {
    soundcloudId: 1003,
    title: 'Electric Dreams',
    artist: 'Demo Artist 3',
    artworkUrl: 'https://via.placeholder.com/500x500?text=Electric+Dreams',
    duration: 195000,
    permalinkUrl: 'https://soundcloud.com/demo/electric-dreams',
    expectedScore: 6.5,
  },
  {
    soundcloudId: 1004,
    title: 'Neon Nights',
    artist: 'Demo Artist 4',
    artworkUrl: 'https://via.placeholder.com/500x500?text=Neon+Nights',
    duration: 225000,
    permalinkUrl: 'https://soundcloud.com/demo/neon-nights',
    expectedScore: 7.0,
  },
  {
    soundcloudId: 1005,
    title: 'Ocean Waves',
    artist: 'Demo Artist 1',
    artworkUrl: 'https://via.placeholder.com/500x500?text=Ocean+Waves',
    duration: 200000,
    permalinkUrl: 'https://soundcloud.com/demo/ocean-waves',
    expectedScore: 8.5,
  },
  {
    soundcloudId: 1006,
    title: 'City Lights',
    artist: 'Demo Artist 2',
    artworkUrl: 'https://via.placeholder.com/500x500?text=City+Lights',
    duration: 185000,
    permalinkUrl: 'https://soundcloud.com/demo/city-lights',
    expectedScore: 7.2,
  },
  {
    soundcloudId: 1007,
    title: 'Stargazer',
    artist: 'Demo Artist 3',
    artworkUrl: 'https://via.placeholder.com/500x500?text=Stargazer',
    duration: 240000,
    permalinkUrl: 'https://soundcloud.com/demo/stargazer',
    expectedScore: 6.8,
  },
  {
    soundcloudId: 1008,
    title: 'Rhythm & Soul',
    artist: 'Demo Artist 4',
    artworkUrl: 'https://via.placeholder.com/500x500?text=Rhythm+Soul',
    duration: 215000,
    permalinkUrl: 'https://soundcloud.com/demo/rhythm-soul',
    expectedScore: 7.8,
  },
];

/**
 * DemoService simulates a full game for demonstration purposes.
 * 
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**
 * - 9.1: Create a Party with 4 simulated Players
 * - 9.2: Auto-submit songs from a curated demo playlist
 * - 9.3: Simulate voting with varied personality patterns
 * - 9.4: Override play_duration to 15 seconds
 * - 9.5: Accelerate finale animations to 2x speed
 * - 9.6: Generate realistic vote distributions
 */
export class DemoService {
  /**
   * Creates a demo party with 4 simulated players.
   * 
   * **Validates: Requirements 9.1**
   * - WHEN demo mode is enabled, THE System SHALL create a Party with 4 simulated Players
   * 
   * **Property 39: Demo Player Count**
   * For any demo mode party, exactly 4 simulated players should be created.
   * 
   * @returns The created party and array of 4 simulated players
   */
  async createDemoParty(): Promise<{ party: Party; players: Player[] }> {
    const partyId = uuidv4();
    const hostId = uuidv4();

    // Create demo-specific settings with demo timing overrides
    const demoSettings: PartySettings = {
      ...DEFAULT_PARTY_SETTINGS,
      songsPerPlayer: 2, // 2 songs per player for demo
      playDuration: DEMO_TIMING_CONFIG.playDuration as 30 | 45 | 60 | 90, // Will be overridden to 15
      enableConfidenceBetting: true,
      enableProgressiveWeighting: true,
      bonusCategoryCount: 2,
    };

    // Generate a unique demo party code
    const code = await this.generateDemoCode();

    // Create the party
    const partyRecord = await prisma.party.create({
      data: {
        id: partyId,
        code,
        status: PartyStatus.LOBBY,
        hostId,
        settings: JSON.stringify(demoSettings),
        isDemoMode: true, // Mark as demo mode
      },
    });

    // Create 4 simulated players
    const players: Player[] = [];
    const playerIds: string[] = [hostId];

    // Create host player first
    const hostRecord = await prisma.player.create({
      data: {
        id: hostId,
        name: DEMO_PLAYER_NAMES[0],
        partyId,
        isHost: true,
        status: PlayerStatus.CONNECTED,
      },
    });

    players.push({
      id: hostRecord.id,
      name: hostRecord.name,
      avatarUrl: hostRecord.avatarUrl,
      partyId: hostRecord.partyId,
      isHost: hostRecord.isHost,
      isReady: hostRecord.isReady,
      status: hostRecord.status as PlayerStatus,
      socketId: hostRecord.socketId,
      joinedAt: hostRecord.joinedAt,
    });

    // Create remaining 3 players
    for (let i = 1; i < 4; i++) {
      const playerId = uuidv4();
      playerIds.push(playerId);

      const playerRecord = await prisma.player.create({
        data: {
          id: playerId,
          name: DEMO_PLAYER_NAMES[i],
          partyId,
          isHost: false,
          status: PlayerStatus.CONNECTED,
        },
      });

      players.push({
        id: playerRecord.id,
        name: playerRecord.name,
        avatarUrl: playerRecord.avatarUrl,
        partyId: playerRecord.partyId,
        isHost: playerRecord.isHost,
        isReady: playerRecord.isReady,
        status: playerRecord.status as PlayerStatus,
        socketId: playerRecord.socketId,
        joinedAt: playerRecord.joinedAt,
      });
    }

    // Assign identities to all players
    await identityService.assignIdentities(partyId, players);

    // Convert party record to typed interface
    const party: Party = {
      id: partyRecord.id,
      code: partyRecord.code,
      status: partyRecord.status as PartyStatus,
      hostId: partyRecord.hostId,
      settings: JSON.parse(partyRecord.settings) as PartySettings,
      createdAt: partyRecord.createdAt,
      startedAt: partyRecord.startedAt,
      completedAt: partyRecord.completedAt,
    };

    return { party, players };
  }

  /**
   * Generates a unique demo party code.
   * Demo codes are prefixed with 'DEMO' for easy identification.
   * 
   * @returns A unique demo party code
   */
  private async generateDemoCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      // Generate a 4-character code
      code = '';
      for (let i = 0; i < 4; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Check if code already exists
      const existing = await prisma.party.findUnique({
        where: { code },
      });

      if (!existing) {
        return code;
      }

      attempts++;
    } while (attempts < maxAttempts);

    throw new Error('Unable to generate unique demo party code');
  }

  /**
   * Populates demo songs from the curated demo playlist.
   * Auto-submits songs for each player with varied confidence levels.
   * 
   * **Validates: Requirements 9.2**
   * - WHEN demo mode is enabled, THE System SHALL auto-submit songs from a curated demo playlist
   * 
   * @param partyId - The ID of the demo party
   * @returns Array of submitted songs
   * @throws Error if party does not exist (PARTY_NOT_FOUND)
   */
  async populateDemoSongs(partyId: string): Promise<Song[]> {
    // Get the party
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      const error = new Error('Party does not exist');
      (error as any).code = 'PARTY_NOT_FOUND';
      throw error;
    }

    // Get party settings
    const settings: PartySettings = JSON.parse(partyRecord.settings);
    const songsPerPlayer = settings.songsPerPlayer;

    // Get all players in the party
    const playerRecords = await prisma.player.findMany({
      where: { partyId },
      orderBy: { joinedAt: 'asc' },
    });

    if (playerRecords.length === 0) {
      return [];
    }

    // Transition party to SUBMITTING state if in LOBBY
    if (partyRecord.status === PartyStatus.LOBBY) {
      await prisma.party.update({
        where: { id: partyId },
        data: {
          status: PartyStatus.SUBMITTING,
          startedAt: new Date(),
        },
      });
    }

    const songs: Song[] = [];
    let trackIndex = 0;

    // Submit songs for each player
    for (const player of playerRecords) {
      for (let songNum = 1; songNum <= songsPerPlayer; songNum++) {
        // Get the next track from the demo playlist (cycle if needed)
        const track = DEMO_PLAYLIST[trackIndex % DEMO_PLAYLIST.length];
        trackIndex++;

        // Assign varied confidence levels (1-5)
        // Use a pattern that creates interesting gameplay
        const confidence = this.getVariedConfidence(player.id, songNum);

        // Create the song
        const songId = uuidv4();
        const songRecord = await prisma.song.create({
          data: {
            id: songId,
            partyId,
            submitterId: player.id,
            soundcloudId: track.soundcloudId,
            title: track.title,
            artist: track.artist,
            artworkUrl: track.artworkUrl,
            duration: track.duration,
            permalinkUrl: track.permalinkUrl,
            confidence,
            roundNumber: songNum,
            queuePosition: 0, // Will be set when organizing into rounds
          },
        });

        songs.push({
          id: songRecord.id,
          partyId: songRecord.partyId,
          submitterId: songRecord.submitterId,
          soundcloudId: songRecord.soundcloudId,
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
        });
      }
    }

    return songs;
  }

  /**
   * Gets a varied confidence level based on player and song number.
   * Creates interesting gameplay by varying confidence across players.
   * 
   * @param playerId - The player's ID (used for deterministic variation)
   * @param songNum - The song number (1, 2, or 3)
   * @returns A confidence level between 1 and 5
   */
  private getVariedConfidence(playerId: string, songNum: number): 1 | 2 | 3 | 4 | 5 {
    // Use a simple hash of playerId to create variation
    const hash = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Create patterns based on song number and player hash
    const patterns: Array<1 | 2 | 3 | 4 | 5>[] = [
      [3, 4, 5], // Increasing confidence
      [5, 3, 2], // Decreasing confidence
      [2, 5, 3], // Mixed pattern
      [4, 2, 4], // U-shape pattern
    ];

    const patternIndex = hash % patterns.length;
    const pattern = patterns[patternIndex];
    
    return pattern[(songNum - 1) % pattern.length];
  }

  /**
   * Simulates voting for a song using personality patterns.
   * Generates realistic vote distributions based on voter personalities.
   * 
   * **Validates: Requirements 9.3, 9.6**
   * - 9.3: Simulate voting with varied personality patterns
   * - 9.6: Generate realistic vote distributions
   * 
   * **Property 40: Demo Vote Generation**
   * For any song in demo mode, votes should be generated according to the
   * personality patterns (harsh critic, generous fan, balanced voter, wildcard).
   * 
   * @param songId - The ID of the song to vote on
   * @param voters - Array of players who will vote (excluding song submitter)
   * @returns Array of generated votes
   * @throws Error if song does not exist (SONG_NOT_FOUND)
   */
  async simulateVoting(songId: string, voters: Player[]): Promise<Vote[]> {
    // Get the song
    const songRecord = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!songRecord) {
      const error = new Error('Song does not exist');
      (error as any).code = 'SONG_NOT_FOUND';
      throw error;
    }

    const votes: Vote[] = [];
    const personalities = this.getVoterPersonalities();

    // Generate votes for each voter
    for (let i = 0; i < voters.length; i++) {
      const voter = voters[i];

      // Skip if voter is the song submitter
      if (voter.id === songRecord.submitterId) {
        continue;
      }

      // Assign a personality to this voter (cycle through personalities)
      const personality = personalities[i % personalities.length];

      // Generate a rating based on the personality
      const rating = this.generateRatingFromPersonality(personality);

      // Create the vote
      const voteId = uuidv4();
      const now = new Date();
      const voteRecord = await prisma.vote.create({
        data: {
          id: voteId,
          songId,
          voterId: voter.id,
          rating,
          isLocked: true,
          votedAt: now,
          lockedAt: now,
        },
      });

      votes.push({
        id: voteRecord.id,
        songId: voteRecord.songId,
        voterId: voteRecord.voterId,
        rating: voteRecord.rating,
        isLocked: voteRecord.isLocked,
        votedAt: voteRecord.votedAt,
        lockedAt: voteRecord.lockedAt,
        superVote: voteRecord.superVote,
        comment: voteRecord.comment,
      });
    }

    return votes;
  }

  /**
   * Generates a rating based on a voter personality.
   * Uses the personality's mean rating and variance to create realistic distributions.
   * 
   * **Validates: Requirements 9.6**
   * - Generate realistic vote distributions
   * 
   * @param personality - The voter personality to use
   * @returns A rating between 1 and 10
   */
  private generateRatingFromPersonality(personality: VoterPersonality): number {
    // Use Box-Muller transform to generate normally distributed random number
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Scale by variance and shift by mean
    let rating = personality.meanRating + z * Math.sqrt(personality.variance);

    // Apply bias adjustments
    if (personality.bias === 'harsh') {
      // Harsh critics tend to round down
      rating = Math.floor(rating);
    } else if (personality.bias === 'generous') {
      // Generous fans tend to round up
      rating = Math.ceil(rating);
    } else {
      // Balanced voters round normally
      rating = Math.round(rating);
    }

    // Clamp to valid range [1, 10]
    return Math.max(1, Math.min(10, rating));
  }

  /**
   * Advances the demo party through game states.
   * Handles state transitions and triggers appropriate actions.
   * 
   * @param partyId - The ID of the demo party
   * @throws Error if party does not exist (PARTY_NOT_FOUND)
   */
  async advanceDemo(partyId: string): Promise<void> {
    // Get the party
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      const error = new Error('Party does not exist');
      (error as any).code = 'PARTY_NOT_FOUND';
      throw error;
    }

    const currentStatus = partyRecord.status as PartyStatus;

    switch (currentStatus) {
      case PartyStatus.LOBBY:
        // Transition to SUBMITTING and populate songs
        await prisma.party.update({
          where: { id: partyId },
          data: {
            status: PartyStatus.SUBMITTING,
            startedAt: new Date(),
          },
        });
        await this.populateDemoSongs(partyId);
        break;

      case PartyStatus.SUBMITTING:
        // Transition to PLAYING
        await prisma.party.update({
          where: { id: partyId },
          data: { status: PartyStatus.PLAYING },
        });
        break;

      case PartyStatus.PLAYING:
        // Transition to FINALE
        await prisma.party.update({
          where: { id: partyId },
          data: { status: PartyStatus.FINALE },
        });
        break;

      case PartyStatus.FINALE:
        // Transition to COMPLETE
        await prisma.party.update({
          where: { id: partyId },
          data: {
            status: PartyStatus.COMPLETE,
            completedAt: new Date(),
          },
        });
        break;

      case PartyStatus.COMPLETE:
        // Already complete, nothing to do
        break;
    }
  }

  /**
   * Gets the curated demo playlist.
   * 
   * @returns Array of demo tracks
   */
  getDemoPlaylist(): DemoTrack[] {
    return [...DEMO_PLAYLIST];
  }

  /**
   * Gets the voter personalities for demo mode.
   * 
   * @returns Array of voter personalities
   */
  getVoterPersonalities(): VoterPersonality[] {
    return [...DEMO_PERSONALITIES];
  }

  /**
   * Gets the demo timing configuration.
   * 
   * **Validates: Requirements 9.4, 9.5**
   * - 9.4: Override play_duration to 15 seconds in demo mode
   * - 9.5: Accelerate finale animations to 2x speed
   * 
   * **Property 41: Demo Playback Duration**
   * For any song in demo mode, the play duration should be 15 seconds
   * regardless of the configured play_duration setting.
   * 
   * @returns Demo timing configuration
   */
  getDemoTimingConfig(): DemoTimingConfig {
    return { ...DEMO_TIMING_CONFIG };
  }

  /**
   * Gets the effective play duration for a party.
   * Returns 15 seconds for demo mode parties, otherwise the configured duration.
   * 
   * **Validates: Requirements 9.4**
   * - WHEN demo mode is enabled, THE System SHALL override play_duration to 15 seconds
   * 
   * @param partyId - The ID of the party
   * @returns The effective play duration in seconds
   * @throws Error if party does not exist (PARTY_NOT_FOUND)
   */
  async getEffectivePlayDuration(partyId: string): Promise<number> {
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      const error = new Error('Party does not exist');
      (error as any).code = 'PARTY_NOT_FOUND';
      throw error;
    }

    // Check if party is in demo mode
    if (partyRecord.isDemoMode) {
      return DEMO_TIMING_CONFIG.playDuration;
    }

    // Return configured play duration
    const settings: PartySettings = JSON.parse(partyRecord.settings);
    return settings.playDuration;
  }

  /**
   * Gets the effective finale animation speed for a party.
   * Returns 2x speed for demo mode parties, otherwise 1x.
   * 
   * **Validates: Requirements 9.5**
   * - WHEN demo mode is enabled, THE System SHALL accelerate finale animations to 2x speed
   * 
   * @param partyId - The ID of the party
   * @returns The animation speed multiplier
   * @throws Error if party does not exist (PARTY_NOT_FOUND)
   */
  async getEffectiveFinaleAnimationSpeed(partyId: string): Promise<number> {
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      const error = new Error('Party does not exist');
      (error as any).code = 'PARTY_NOT_FOUND';
      throw error;
    }

    // Check if party is in demo mode
    if (partyRecord.isDemoMode) {
      return DEMO_TIMING_CONFIG.finaleAnimationSpeed;
    }

    // Return normal speed for non-demo parties
    return 1.0;
  }

  /**
   * Checks if a party is in demo mode.
   * 
   * @param partyId - The ID of the party
   * @returns true if the party is in demo mode, false otherwise
   * @throws Error if party does not exist (PARTY_NOT_FOUND)
   */
  async isDemoMode(partyId: string): Promise<boolean> {
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      const error = new Error('Party does not exist');
      (error as any).code = 'PARTY_NOT_FOUND';
      throw error;
    }

    return partyRecord.isDemoMode ?? false;
  }
}

// Export singleton instance
export const demoService = new DemoService();
