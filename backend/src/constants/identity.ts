/**
 * Identity Constants for Nero Party
 * 
 * These pools are used by IdentityService to assign anonymous identities
 * to players during gameplay. Each player receives a unique combination
 * of alias, silhouette, and color.
 * 
 * @see Requirements 2.1 - Pool of at least 32 unique names
 * @see Requirements 2.3 - Silhouette shapes and colors
 */

/**
 * Pool of unique aliases for anonymous player identities.
 * Must contain at least 32 unique names per Requirement 2.1.
 * Names are fun, creative, and music/party themed.
 */
export const ALIAS_POOL: readonly string[] = [
  // Cosmic/Space themed
  'Shadow Wolf',
  'Midnight Phoenix',
  'Cosmic Dancer',
  'Neon Phantom',
  'Stellar Viper',
  'Lunar Echo',
  'Nova Spark',
  'Astral Raven',
  
  // Music/Sound themed
  'Bass Bandit',
  'Rhythm Ghost',
  'Sonic Specter',
  'Beat Ninja',
  'Melody Mystic',
  'Tempo Thief',
  'Vinyl Vortex',
  'Synth Serpent',
  
  // Nature/Elements themed
  'Electric Falcon',
  'Thunder Fox',
  'Crystal Cobra',
  'Frost Panther',
  'Storm Hawk',
  'Ember Tiger',
  'Ocean Owl',
  'Jade Dragon',
  
  // Abstract/Mysterious themed
  'Velvet Shadow',
  'Chrome Sphinx',
  'Prism Prowler',
  'Cipher Knight',
  'Quantum Jester',
  'Void Walker',
  'Pixel Phantom',
  'Glitch Wizard',
  
  // Additional names for larger parties
  'Neon Nomad',
  'Disco Demon',
  'Funk Fury',
  'Groove Guardian',
  'Pulse Pioneer',
  'Wave Warrior',
  'Echo Enigma',
  'Drift Dancer',
] as const;

/**
 * Pool of silhouette identifiers for player avatars.
 * Each silhouette represents an abstract shape that masks the player's identity.
 * These are used with the color to create unique visual identities.
 */
export const AVATAR_SILHOUETTES: readonly string[] = [
  // Animals
  'wolf',
  'phoenix',
  'cat',
  'owl',
  'fox',
  'raven',
  'panther',
  'dragon',
  
  // Abstract shapes
  'robot',
  'ghost',
  'ninja',
  'wizard',
  'knight',
  'jester',
  'sphinx',
  'alien',
  
  // Geometric
  'diamond',
  'star',
  'moon',
  'sun',
  'crystal',
  'prism',
  'orb',
  'flame',
] as const;

/**
 * Pool of vibrant/neon colors for player identities.
 * Colors are chosen to match the glassmorphism design system
 * with neon accents (purple, cyan, pink) as specified in Requirement 13.3.
 * All colors are in hex format.
 */
export const PLAYER_COLORS: readonly string[] = [
  // Primary neon colors (from design system)
  '#A855F7', // Purple (violet-500)
  '#06B6D4', // Cyan (cyan-500)
  '#EC4899', // Pink (pink-500)
  
  // Extended neon palette
  '#8B5CF6', // Violet (violet-500)
  '#3B82F6', // Blue (blue-500)
  '#14B8A6', // Teal (teal-500)
  '#22C55E', // Green (green-500)
  '#EAB308', // Yellow (yellow-500)
  '#F97316', // Orange (orange-500)
  '#EF4444', // Red (red-500)
  '#F472B6', // Light Pink (pink-400)
  '#818CF8', // Light Violet (indigo-400)
  
  // Bright neon variants
  '#C084FC', // Light Purple (purple-400)
  '#22D3EE', // Light Cyan (cyan-400)
  '#34D399', // Light Teal (emerald-400)
  '#FBBF24', // Amber (amber-400)
] as const;

/**
 * Type definitions for the identity pools
 */
export type Alias = typeof ALIAS_POOL[number];
export type Silhouette = typeof AVATAR_SILHOUETTES[number];
export type PlayerColor = typeof PLAYER_COLORS[number];

/**
 * Validation constants
 */
export const MIN_ALIAS_POOL_SIZE = 32;
export const MIN_SILHOUETTE_POOL_SIZE = 16;
export const MIN_COLOR_POOL_SIZE = 12;

// Runtime validation to ensure pools meet minimum requirements
if (ALIAS_POOL.length < MIN_ALIAS_POOL_SIZE) {
  throw new Error(
    `ALIAS_POOL must contain at least ${MIN_ALIAS_POOL_SIZE} unique names. ` +
    `Current count: ${ALIAS_POOL.length}`
  );
}

if (AVATAR_SILHOUETTES.length < MIN_SILHOUETTE_POOL_SIZE) {
  throw new Error(
    `AVATAR_SILHOUETTES must contain at least ${MIN_SILHOUETTE_POOL_SIZE} silhouettes. ` +
    `Current count: ${AVATAR_SILHOUETTES.length}`
  );
}

if (PLAYER_COLORS.length < MIN_COLOR_POOL_SIZE) {
  throw new Error(
    `PLAYER_COLORS must contain at least ${MIN_COLOR_POOL_SIZE} colors. ` +
    `Current count: ${PLAYER_COLORS.length}`
  );
}
