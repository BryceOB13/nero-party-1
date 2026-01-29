// Party Status enum
export enum PartyStatus {
  LOBBY = 'LOBBY',
  SUBMITTING = 'SUBMITTING',
  PLAYING = 'PLAYING',
  FINALE = 'FINALE',
  COMPLETE = 'COMPLETE'
}

// Player Status enum
export enum PlayerStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  KICKED = 'KICKED'
}

// Mini-event frequency type
// **Validates: Requirement 21.2**
export type MiniEventFrequency = 'rare' | 'normal' | 'chaos';

// Party Settings interface
// **Validates: Requirements 21.1-21.8**
export interface PartySettings {
  // Core game settings
  songsPerPlayer: 1 | 2 | 3;
  playDuration: 30 | 45 | 60 | 90;
  submissionTimerMinutes: number | null;
  enableConfidenceBetting: boolean;
  enableProgressiveWeighting: boolean;
  bonusCategoryCount: 0 | 1 | 2 | 3;
  
  // Competitive feature toggles
  // **Validates: Requirement 21.1** - Support enabling/disabling mini-events
  enableMiniEvents: boolean;
  // **Validates: Requirement 21.2** - Support mini-event frequency: rare, normal, or chaos
  miniEventFrequency: MiniEventFrequency;
  // **Validates: Requirement 21.3** - Support enabling/disabling power-ups
  enablePowerUps: boolean;
  // **Validates: Requirement 21.4** - Support configuring starting power-up points
  startingPowerUpPoints: number;
  // **Validates: Requirement 21.5** - Support enabling/disabling achievements
  enableAchievements: boolean;
  // **Validates: Requirement 21.6** - Support enabling/disabling predictions
  enablePredictions: boolean;
  // **Validates: Requirement 21.7** - Support enabling/disabling theme adherence voting
  enableThemes: boolean;
  // Enable vote comments for finale reveals
  enableVoteComments: boolean;
}

// Default party settings
// **Validates: Requirements 21.1-21.8**
export const DEFAULT_PARTY_SETTINGS: PartySettings = {
  // Core game settings
  songsPerPlayer: 2,
  playDuration: 45,
  submissionTimerMinutes: null,
  enableConfidenceBetting: true,
  enableProgressiveWeighting: true,
  bonusCategoryCount: 2,
  
  // Competitive features - enabled by default with normal settings
  enableMiniEvents: true,
  miniEventFrequency: 'normal',
  enablePowerUps: true,
  startingPowerUpPoints: 10,
  enableAchievements: true,
  enablePredictions: true,
  enableThemes: true,
  enableVoteComments: true,
};

/**
 * Competitive presets for quick game configuration.
 * **Validates: Requirement 21.8** - Provide competitive presets: casual, competitive, and chaos
 */
export const COMPETITIVE_PRESETS: Record<'casual' | 'competitive' | 'chaos', Partial<PartySettings>> = {
  /**
   * Casual preset: All competitive features disabled for a simple game experience.
   * Best for new players or those who want a straightforward music guessing game.
   */
  casual: {
    enableMiniEvents: false,
    miniEventFrequency: 'rare',
    enablePowerUps: false,
    startingPowerUpPoints: 0,
    enableAchievements: false,
    enablePredictions: false,
    enableThemes: false,
    enableVoteComments: false,
  },
  /**
   * Competitive preset: All features enabled with normal frequency.
   * The standard competitive experience with balanced event frequency.
   */
  competitive: {
    enableMiniEvents: true,
    miniEventFrequency: 'normal',
    enablePowerUps: true,
    startingPowerUpPoints: 10,
    enableAchievements: true,
    enablePredictions: true,
    enableThemes: true,
    enableVoteComments: true,
  },
  /**
   * Chaos preset: All features enabled with maximum event frequency.
   * For players who want maximum unpredictability and excitement.
   */
  chaos: {
    enableMiniEvents: true,
    miniEventFrequency: 'chaos',
    enablePowerUps: true,
    startingPowerUpPoints: 15,
    enableAchievements: true,
    enablePredictions: true,
    enableThemes: true,
    enableVoteComments: true,
  },
};

// Party interface
export interface Party {
  id: string;
  code: string;
  status: PartyStatus;
  hostId: string;
  settings: PartySettings;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

// Player interface
export interface Player {
  id: string;
  name: string;
  avatarUrl: string | null;
  partyId: string;
  isHost: boolean;
  isReady: boolean;
  status: PlayerStatus;
  socketId: string | null;
  joinedAt: Date;
}

// PartyIdentity interface
export interface PartyIdentity {
  id: string;
  partyId: string;
  playerId: string;
  alias: string;
  silhouette: string;
  color: string;
  isRevealed: boolean;
  revealedAt: Date | null;
  revealOrder: number | null;
}

// Song interface
export interface Song {
  id: string;
  partyId: string;
  submitterId: string;
  soundcloudId: number | bigint;
  title: string;
  artist: string;
  artworkUrl: string;
  duration: number;
  permalinkUrl: string;
  confidence: 1 | 2 | 3 | 4 | 5;
  roundNumber: number;
  queuePosition: number;
  rawAverage: number | null;
  weightedScore: number | null;
  confidenceModifier: number | null;
  finalScore: number | null;
  voteDistribution: number[] | null;
  submittedAt: Date;
}

// Vote interface
export interface Vote {
  id: string;
  songId: string;
  voterId: string;
  rating: number;
  isLocked: boolean;
  votedAt: Date;
  lockedAt: Date | null;
  superVote: boolean;  // Whether this vote counts as 1.5x weight (costs 2 points)
  comment: string | null;  // Optional comment (roast or praise) revealed during finale, max 280 chars
}

// BonusResult interface
export interface BonusResult {
  id: string;
  partyId: string;
  categoryId: string;
  categoryName: string;
  winningSongId: string;
  winnerPlayerId: string;
  points: number;
  revealOrder: number;
}

// Round interface (computed, not stored)
export interface Round {
  roundNumber: number;
  songs: Song[];
  weightMultiplier: number;
  isComplete: boolean;
}

// Leaderboard entry interface
export interface LeaderboardEntry {
  rank: number;
  alias: string;
  silhouette: string;
  color: string;
  score: number;
  previousScore: number | null;
  movement: 'up' | 'down' | 'same' | 'new';
  songCount: number;
  isRevealed: boolean;
  revealedName: string | null;
}

// Final standing interface
export interface FinalStanding {
  playerId: string;
  alias: string;
  realName: string;
  rank: number;
  songs: Song[];
  totalBaseScore: number;
  confidenceModifiers: number;
  bonusPoints: number;
  finalScore: number;
  bonusCategories: string[];
  highestSong: Song;
  lowestSong: Song;
}

// SoundCloud track interface
export interface SoundCloudTrack {
  id: number;
  title: string;
  description: string;
  duration: number;
  genre: string;
  user: {
    id: number;
    username: string;
    avatar_url: string;
  };
  artwork_url: string | null;
  waveform_url: string;
  stream_url: string;
  permalink_url: string;
  playback_count: number;
  likes_count: number;
  access: 'playable' | 'preview' | 'blocked';
  streamable: boolean;
}

// Song submission data
export interface SongSubmission {
  soundcloudId: number | bigint;
  title: string;
  artist: string;
  artworkUrl: string;
  duration: number;
  permalinkUrl: string;
  confidence: 1 | 2 | 3 | 4 | 5;
}

// Bonus category interface
export interface BonusCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  points: number;
}

// Theme Types
// **Validates: Requirements 6.1, 6.4, 7.1**

/**
 * Constraints that can be applied to a party theme.
 * These constraints guide song selection for all rounds.
 */
export interface ThemeConstraints {
  genres?: string[];
  decades?: string[];
  moods?: string[];
  bpmRange?: { min: number; max: number };
  explicit?: boolean | null;
  artistRestrictions?: string;
}

/**
 * Represents a party-wide theme that applies to all rounds.
 * **Validates: Requirements 6.1, 6.3, 6.4**
 */
export interface PartyTheme {
  id: string;
  name: string;
  description: string;
  icon: string;
  constraints: ThemeConstraints;
  isCustom: boolean;
}

/**
 * Represents a theme for an individual round.
 * **Validates: Requirements 7.1, 7.4**
 */
export interface RoundTheme {
  id: string;
  name: string;
  prompt: string;
  votingPrompt: string;
  icon: string;
  bonusMultiplier: number;
}

/**
 * Predefined party themes.
 * **Validates: Requirement 6.1** - At least 8 predefined Party_Themes
 */
export const PARTY_THEMES: PartyTheme[] = [
  {
    id: 'anything-goes',
    name: 'Anything Goes',
    description: 'No restrictions - submit any song you love!',
    icon: '🎵',
    constraints: {},
    isCustom: false,
  },
  {
    id: 'throwback-party',
    name: 'Throwback Party',
    description: 'Songs from before 2010 only - take us back in time!',
    icon: '⏪',
    constraints: {
      decades: ['1960s', '1970s', '1980s', '1990s', '2000s'],
    },
    isCustom: false,
  },
  {
    id: 'underground-only',
    name: 'Underground Only',
    description: 'Hidden gems and lesser-known tracks - no mainstream hits!',
    icon: '🔦',
    constraints: {
      artistRestrictions: 'No artists with over 1 million monthly listeners',
    },
    isCustom: false,
  },
  {
    id: 'high-energy',
    name: 'High Energy',
    description: 'Fast-paced bangers to get the party moving!',
    icon: '⚡',
    constraints: {
      moods: ['energetic', 'upbeat', 'hype'],
      bpmRange: { min: 120, max: 200 },
    },
    isCustom: false,
  },
  {
    id: 'chill-vibes',
    name: 'Chill Vibes',
    description: 'Relaxed, mellow tracks for a laid-back atmosphere.',
    icon: '🌊',
    constraints: {
      moods: ['chill', 'relaxed', 'mellow', 'ambient'],
      bpmRange: { min: 60, max: 110 },
    },
    isCustom: false,
  },
  {
    id: 'guilty-pleasures',
    name: 'Guilty Pleasures',
    description: 'Songs you secretly love but might be embarrassed to admit!',
    icon: '🙈',
    constraints: {
      moods: ['fun', 'cheesy', 'nostalgic'],
    },
    isCustom: false,
  },
  {
    id: 'one-hit-wonders',
    name: 'One Hit Wonders',
    description: 'Artists known for just one big song - find those gems!',
    icon: '💫',
    constraints: {
      artistRestrictions: 'Artists with only one major hit',
    },
    isCustom: false,
  },
  {
    id: 'decade-battle',
    name: 'Decade Battle',
    description: 'Each round features a different decade - compete across eras!',
    icon: '🗓️',
    constraints: {
      decades: ['1970s', '1980s', '1990s', '2000s', '2010s', '2020s'],
    },
    isCustom: false,
  },
];

/**
 * Predefined round themes across mood-based, challenge-based, and genre-specific categories.
 * **Validates: Requirement 7.1** - At least 12 predefined Round_Themes
 */
export const ROUND_THEMES: RoundTheme[] = [
  // Mood-based themes
  {
    id: 'pump-up',
    name: 'Pump Up',
    prompt: 'Submit a song that gets you hyped and ready to go!',
    votingPrompt: 'How well does this song pump you up?',
    icon: '💪',
    bonusMultiplier: 1.0,
  },
  {
    id: 'tearjerker',
    name: 'Tearjerker',
    prompt: 'Submit a song that hits you right in the feels.',
    votingPrompt: 'How emotional does this song make you feel?',
    icon: '😢',
    bonusMultiplier: 1.0,
  },
  {
    id: 'feel-good',
    name: 'Feel Good',
    prompt: 'Submit a song that instantly puts you in a good mood!',
    votingPrompt: 'How much does this song lift your spirits?',
    icon: '😊',
    bonusMultiplier: 1.0,
  },
  {
    id: 'late-night',
    name: 'Late Night',
    prompt: 'Submit a song perfect for 2 AM vibes.',
    votingPrompt: 'How well does this fit the late night mood?',
    icon: '🌙',
    bonusMultiplier: 1.0,
  },
  // Challenge-based themes
  {
    id: 'deep-cut',
    name: 'Deep Cut',
    prompt: 'Submit a song most people probably haven\'t heard.',
    votingPrompt: 'How obscure is this track?',
    icon: '💎',
    bonusMultiplier: 1.2,
  },
  {
    id: 'guilty-pleasure',
    name: 'Guilty Pleasure',
    prompt: 'Submit a song you love but might be embarrassed to admit!',
    votingPrompt: 'How guilty of a pleasure is this?',
    icon: '🙊',
    bonusMultiplier: 1.1,
  },
  {
    id: 'one-word',
    name: 'One Word',
    prompt: 'Submit a song with a one-word title.',
    votingPrompt: 'Does this song nail the one-word title theme?',
    icon: '1️⃣',
    bonusMultiplier: 1.0,
  },
  {
    id: 'cover-version',
    name: 'Cover Version',
    prompt: 'Submit a cover that\'s better than (or as good as) the original!',
    votingPrompt: 'How does this cover stack up?',
    icon: '🔄',
    bonusMultiplier: 1.2,
  },
  // Genre-specific themes
  {
    id: 'electronic-dreams',
    name: 'Electronic Dreams',
    prompt: 'Submit your favorite electronic/EDM track.',
    votingPrompt: 'How well does this represent electronic music?',
    icon: '🎛️',
    bonusMultiplier: 1.0,
  },
  {
    id: 'hip-hop-heat',
    name: 'Hip-Hop Heat',
    prompt: 'Submit a hip-hop or rap track that goes hard.',
    votingPrompt: 'How hard does this track go?',
    icon: '🎤',
    bonusMultiplier: 1.0,
  },
  {
    id: 'rock-anthem',
    name: 'Rock Anthem',
    prompt: 'Submit a rock song that deserves to be played loud!',
    votingPrompt: 'Is this a true rock anthem?',
    icon: '🎸',
    bonusMultiplier: 1.0,
  },
  {
    id: 'indie-darling',
    name: 'Indie Darling',
    prompt: 'Submit an indie track that deserves more recognition.',
    votingPrompt: 'How indie is this track?',
    icon: '🎹',
    bonusMultiplier: 1.1,
  },
];

// Achievement Types
// **Validates: Requirements 9.1, 9.2, 9.5, 9.6, 9.7**

/**
 * Condition types for achievement unlocking.
 * Each condition type has specific parameters for evaluation.
 * **Validates: Requirements 9.5, 9.6, 9.7**
 */
export type AchievementCondition =
  | { type: 'score_threshold'; song: 'any' | 'all'; threshold: number }
  | { type: 'perfect_score' }
  | { type: 'comeback'; positionsGained: number }
  | { type: 'consistency'; variance: number }
  | { type: 'polarizing'; minVariance: number }
  | { type: 'sweep'; categoriesWon: number }
  | { type: 'underdog'; startPosition: number; endPosition: number }
  | { type: 'streak'; streakType: 'voting' | 'winning'; count: number };

/**
 * Represents an achievement that players can unlock.
 * **Validates: Requirements 9.1, 9.2**
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  bonusPoints: number;
  condition: AchievementCondition;
}

/**
 * Represents an achievement unlocked by a player in a specific party.
 * **Validates: Requirement 9.4**
 */
export interface PlayerAchievement {
  id: string;
  playerId: string;
  achievementId: string;
  unlockedAt: Date;
  partyId: string;
  bonusPoints: number;
}

/**
 * Predefined achievements for the competitive mode.
 * **Validates: Requirements 9.1, 9.2, 9.5, 9.6, 9.7**
 */
export const ACHIEVEMENTS: Achievement[] = [
  // Score-based achievements (Requirement 9.5)
  {
    id: 'crowd-pleaser',
    name: 'Crowd Pleaser',
    description: 'Achieve an average score of 9 or higher on any song.',
    icon: '🎉',
    rarity: 'uncommon',
    bonusPoints: 5,
    condition: { type: 'score_threshold', song: 'any', threshold: 9 },
  },
  {
    id: 'perfect-10',
    name: 'Perfect 10',
    description: 'Achieve a perfect 10.0 average score on a song.',
    icon: '💯',
    rarity: 'legendary',
    bonusPoints: 15,
    condition: { type: 'perfect_score' },
  },
  {
    id: 'consistent-king',
    name: 'Consistent King',
    description: 'Have all your songs score within 1 point of each other.',
    icon: '👑',
    rarity: 'rare',
    bonusPoints: 10,
    condition: { type: 'consistency', variance: 1 },
  },
  // Position-based achievements (Requirement 9.6)
  {
    id: 'comeback-kid',
    name: 'Comeback Kid',
    description: 'Gain 3 or more positions in a single round.',
    icon: '🚀',
    rarity: 'uncommon',
    bonusPoints: 5,
    condition: { type: 'comeback', positionsGained: 3 },
  },
  {
    id: 'underdog-victory',
    name: 'Underdog Victory',
    description: 'Win the game after being in last place.',
    icon: '🏆',
    rarity: 'legendary',
    bonusPoints: 20,
    condition: { type: 'underdog', startPosition: -1, endPosition: 1 },
  },
  // Social achievements (Requirement 9.7)
  {
    id: 'love-hate',
    name: 'Love/Hate',
    description: 'Receive both a 1 and a 10 rating on the same song.',
    icon: '💔',
    rarity: 'rare',
    bonusPoints: 8,
    condition: { type: 'polarizing', minVariance: 9 },
  },
  {
    id: 'category-sweep',
    name: 'Category Sweep',
    description: 'Win 2 or more bonus categories.',
    icon: '🧹',
    rarity: 'rare',
    bonusPoints: 10,
    condition: { type: 'sweep', categoriesWon: 2 },
  },
];

// Mini-Event Types
// **Validates: Requirements 11.1, 11.2, 11.3, 12.1-12.9**

/**
 * Event timing determines when an event can trigger during gameplay.
 * **Validates: Requirement 11.2**
 */
export type EventTiming = 'pre-round' | 'mid-round' | 'post-round' | 'pre-finale';

/**
 * Union type for all mini-event effects.
 * Each effect type has specific parameters for how it modifies the game.
 * **Validates: Requirement 11.3**
 */
export type MiniEventEffect =
  | { type: 'score_multiplier'; target: 'winner' | 'loser' | 'random' | 'all'; multiplier: number }
  | { type: 'steal_points'; from: 'leader' | 'random'; amount: number | 'percentage'; percentage?: number }
  | { type: 'swap_scores'; players: 'adjacent' | 'random_pair' | 'top_bottom' }
  | { type: 'double_or_nothing'; target: 'next_song' }
  | { type: 'immunity'; target: 'last_place' }
  | { type: 'vote_reveal'; count: number }
  | { type: 'sabotage'; effect: 'shuffle_queue' | 'hide_scores' | 'anonymous_voting' };

/**
 * Represents a mini-event that can occur during gameplay.
 * **Validates: Requirements 11.1, 11.2**
 */
export interface MiniEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  timing: EventTiming;
  effect: MiniEventEffect;
  probability: number;
}

/**
 * Represents an active event that has been triggered in a party.
 * **Validates: Requirement 19.4**
 */
export interface ActiveEvent {
  id: string;
  partyId: string;
  eventId: string;
  triggeredAt: Date;
  roundNumber: number | null;
  affectedPlayers: string[];
  resolved: boolean;
}

/**
 * Result of applying a mini-event effect.
 * Contains information about what changed due to the event.
 */
export interface EventEffectResult {
  type: string;
  affectedPlayers: string[];
  scoreChanges: Record<string, number>;
  message: string;
}

/**
 * Predefined mini-events for the competitive mode.
 * **Validates: Requirements 11.1, 12.1-12.9**
 */
export const MINI_EVENTS: MiniEvent[] = [
  // Golden Record - 2x points for winner (Requirement 12.1)
  {
    id: 'golden-record',
    name: 'Golden Record',
    description: 'The next song earns 2x points for its submitter!',
    icon: '🏆',
    timing: 'pre-round',
    effect: { type: 'score_multiplier', target: 'winner', multiplier: 2 },
    probability: 0.15,
  },
  // Steal the Aux - Last place steals 10% from leader (Requirement 12.2)
  {
    id: 'steal-the-aux',
    name: 'Steal the Aux',
    description: 'Last place steals 10% of the leader\'s points!',
    icon: '🎧',
    timing: 'post-round',
    effect: { type: 'steal_points', from: 'leader', amount: 'percentage', percentage: 10 },
    probability: 0.10,
  },
  // Score Swap - Two random players swap scores (Requirement 12.3)
  {
    id: 'score-swap',
    name: 'Score Swap',
    description: 'Two random players swap their total scores!',
    icon: '🔄',
    timing: 'post-round',
    effect: { type: 'swap_scores', players: 'random_pair' },
    probability: 0.08,
  },
  // Underdog Bonus - Last place gets 1.5x points (Requirement 12.4)
  {
    id: 'underdog-bonus',
    name: 'Underdog Bonus',
    description: 'Last place gets 1.5x points this round!',
    icon: '🐕',
    timing: 'pre-round',
    effect: { type: 'score_multiplier', target: 'loser', multiplier: 1.5 },
    probability: 0.12,
  },
  // Double or Nothing - Score 7+ doubles, under 5 gets zero (Requirement 12.5)
  {
    id: 'double-or-nothing',
    name: 'Double or Nothing',
    description: 'Score 7+ doubles your points, under 5 gets zero!',
    icon: '🎰',
    timing: 'pre-round',
    effect: { type: 'double_or_nothing', target: 'next_song' },
    probability: 0.10,
  },
  // Immunity Idol - Last place immune from losing points (Requirement 12.6)
  {
    id: 'immunity-idol',
    name: 'Immunity Idol',
    description: 'Last place is immune from losing points this round!',
    icon: '🛡️',
    timing: 'pre-round',
    effect: { type: 'immunity', target: 'last_place' },
    probability: 0.10,
  },
  // Vote Leak - One random vote revealed after each song (Requirement 12.7)
  {
    id: 'vote-leak',
    name: 'Vote Leak',
    description: 'One random vote is revealed after each song!',
    icon: '👁️',
    timing: 'mid-round',
    effect: { type: 'vote_reveal', count: 1 },
    probability: 0.15,
  },
  // Shuffle Chaos - Remaining queue order randomized (Requirement 12.8)
  {
    id: 'shuffle-chaos',
    name: 'Shuffle Chaos',
    description: 'The remaining song queue is shuffled randomly!',
    icon: '🔀',
    timing: 'mid-round',
    effect: { type: 'sabotage', effect: 'shuffle_queue' },
    probability: 0.08,
  },
  // Score Blackout - Leaderboard hidden until finale (Requirement 12.9)
  {
    id: 'score-blackout',
    name: 'Score Blackout',
    description: 'The leaderboard is hidden until the finale!',
    icon: '🌑',
    timing: 'mid-round',
    effect: { type: 'sabotage', effect: 'hide_scores' },
    probability: 0.05,
  },
];

// Power-Up Types
// **Validates: Requirements 13.1, 13.2, 14.1-14.6**

/**
 * Power-up timing determines when a power-up can be used during gameplay.
 * **Validates: Requirement 13.2**
 */
export type PowerUpTiming = 'submission' | 'voting' | 'anytime';

/**
 * Union type for all power-up effects.
 * Each effect type has specific parameters for how it modifies the game.
 * **Validates: Requirement 13.1**
 */
export type PowerUpEffect =
  | { type: 'peek'; target: 'vote' | 'identity' }
  | { type: 'boost'; target: 'vote'; multiplier: number }
  | { type: 'insurance'; protection: 'lowest_vote' }
  | { type: 'second_chance'; threshold: number }
  | { type: 'anonymous_vote' };

/**
 * Represents a power-up that players can purchase and use.
 * **Validates: Requirements 13.1, 13.2**
 */
export interface PowerUp {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  timing: PowerUpTiming;
  effect: PowerUpEffect;
  maxPerPlayer: number;
}

/**
 * Represents a power-up owned by a player.
 * **Validates: Requirement 19.5**
 */
export interface PlayerPowerUp {
  id: string;
  playerId: string;
  powerUpId: string;
  purchasedAt: Date;
  usedAt: Date | null;
  usedOnSongId: string | null;
}

/**
 * Predefined power-ups for the competitive mode.
 * **Validates: Requirements 13.1, 14.1-14.6**
 */
export const POWER_UPS: PowerUp[] = [
  // Sneak Peek - See one random vote before it's locked (Requirement 14.1)
  {
    id: 'sneak-peek',
    name: 'Sneak Peek',
    description: 'See one random vote before it\'s locked.',
    icon: '👀',
    cost: 3,
    timing: 'voting',
    effect: { type: 'peek', target: 'vote' },
    maxPerPlayer: 1,
  },
  // Unmask - Reveal one player's identity early (Requirement 14.2)
  {
    id: 'unmask',
    name: 'Unmask',
    description: 'Reveal one player\'s identity early.',
    icon: '🎭',
    cost: 5,
    timing: 'anytime',
    effect: { type: 'peek', target: 'identity' },
    maxPerPlayer: 1,
  },
  // Critic Bomb - Your next vote counts as 1.5x weight (Requirement 14.3)
  {
    id: 'critic-bomb',
    name: 'Critic Bomb',
    description: 'Your next vote counts as 1.5x weight.',
    icon: '💣',
    cost: 4,
    timing: 'voting',
    effect: { type: 'boost', target: 'vote', multiplier: 1.5 },
    maxPerPlayer: 1,
  },
  // Insurance Policy - Protect your song from the lowest vote (Requirement 14.4)
  {
    id: 'insurance-policy',
    name: 'Insurance Policy',
    description: 'Protect your song from the lowest vote.',
    icon: '🛡️',
    cost: 3,
    timing: 'submission',
    effect: { type: 'insurance', protection: 'lowest_vote' },
    maxPerPlayer: 1,
  },
  // Second Chance - Re-submit one song if it scores below 5 (Requirement 14.5)
  {
    id: 'second-chance',
    name: 'Second Chance',
    description: 'Re-submit one song if it scores below 5.',
    icon: '🔄',
    cost: 6,
    timing: 'submission',
    effect: { type: 'second_chance', threshold: 5 },
    maxPerPlayer: 1,
  },
  // Anonymous Critic - Hide your identity on one vote (Requirement 14.6)
  {
    id: 'anonymous-critic',
    name: 'Anonymous Critic',
    description: 'Hide your identity on one vote.',
    icon: '🥷',
    cost: 2,
    timing: 'voting',
    effect: { type: 'anonymous_vote' },
    maxPerPlayer: 1,
  },
];

// Prediction Types
// **Validates: Requirements 16.2, 16.5**

/**
 * Types of predictions players can make about round outcomes.
 * **Validates: Requirement 16.2**
 * - winner: Predict which song will have the highest score
 * - loser: Predict which song will have the lowest score
 * - average: Predict the round's average rating (within 0.5 of actual)
 */
export type PredictionType = 'winner' | 'loser' | 'average';

/**
 * Input for a single prediction submitted by a player.
 * **Validates: Requirement 16.2**
 */
export interface PredictionInput {
  type: PredictionType;
  value: string; // playerId for winner/loser, number string for average
}

/**
 * Represents a stored prediction for a round.
 * **Validates: Requirements 16.1, 16.5**
 */
export interface RoundPrediction {
  id: string;
  playerId: string;
  roundNumber: number;
  partyId: string;
  predictions: PredictionInput[];
  pointsEarned: number;
  submittedAt: Date;
  evaluatedAt: Date | null;
}

/**
 * Result of evaluating a single prediction.
 * **Validates: Requirements 16.3, 16.5**
 */
export interface PredictionResult {
  predictionType: PredictionType;
  predicted: string;
  actual: string;
  correct: boolean;
  pointsAwarded: number;
}

/**
 * Points awarded for correct predictions.
 * **Validates: Requirement 16.5**
 * - winner: 2 points for correctly predicting the highest-scoring song
 * - loser: 2 points for correctly predicting the lowest-scoring song
 * - average: 3 points for predicting within 0.5 of the actual round average
 */
export const PREDICTION_POINTS = {
  winner: 2,
  loser: 2,
  average: 3,
} as const;
