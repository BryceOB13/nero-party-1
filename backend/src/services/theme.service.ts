import { prisma } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import {
  PartyTheme,
  RoundTheme,
  ThemeConstraints,
  PARTY_THEMES,
  ROUND_THEMES,
  AppError,
  ClientErrorCode,
} from '../types';

/**
 * ThemeService handles party theme and round theme management.
 * 
 * **Validates: Requirements 6.2, 6.3, 6.4, 7.2, 7.3, 7.4, 8.3**
 */
export class ThemeService {
  /**
   * Gets all predefined party themes.
   * 
   * **Validates: Requirement 6.1**
   * - THE Theme_System SHALL provide at least 8 predefined Party_Themes
   * 
   * @returns Array of predefined party themes
   */
  getPartyThemes(): PartyTheme[] {
    return PARTY_THEMES;
  }

  /**
   * Sets the party theme for a party.
   * 
   * **Validates: Requirement 6.2**
   * - WHEN a host selects a Party_Theme, THE Theme_System SHALL store the theme selection with the party
   * 
   * @param partyId - The ID of the party
   * @param themeId - The ID of the theme to set
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if theme does not exist (THEME_NOT_FOUND)
   */
  async setPartyTheme(partyId: string, themeId: string): Promise<void> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Check if theme is a predefined theme
    const predefinedTheme = PARTY_THEMES.find(t => t.id === themeId);
    
    if (predefinedTheme) {
      // For predefined themes, ensure it exists in the database or create it
      let dbTheme = await prisma.partyTheme.findUnique({
        where: { id: themeId },
      });

      if (!dbTheme) {
        // Create the predefined theme in the database
        dbTheme = await prisma.partyTheme.create({
          data: {
            id: predefinedTheme.id,
            name: predefinedTheme.name,
            description: predefinedTheme.description,
            icon: predefinedTheme.icon,
            constraints: JSON.stringify(predefinedTheme.constraints),
            isCustom: false,
          },
        });
      }

      // Update the party with the theme
      await prisma.party.update({
        where: { id: partyId },
        data: { partyThemeId: themeId },
      });
    } else {
      // Check if it's a custom theme in the database
      const customTheme = await prisma.partyTheme.findUnique({
        where: { id: themeId },
      });

      if (!customTheme) {
        throw new AppError(ClientErrorCode.THEME_NOT_FOUND, 'Theme does not exist');
      }

      // Update the party with the custom theme
      await prisma.party.update({
        where: { id: partyId },
        data: { partyThemeId: themeId },
      });
    }
  }

  /**
   * Creates a custom party theme with configurable constraints.
   * 
   * **Validates: Requirement 6.3**
   * - THE Theme_System SHALL support custom Party_Theme creation with configurable constraints
   * 
   * **Validates: Requirement 6.4**
   * - THE Theme_System SHALL support constraints for genres, decades, moods, BPM range, explicit content, and artist restrictions
   * 
   * @param partyId - The ID of the party creating the custom theme
   * @param constraints - The theme constraints
   * @returns The created custom theme
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   * @throws AppError if constraints are invalid (INVALID_CONSTRAINTS)
   */
  async createCustomTheme(partyId: string, constraints: ThemeConstraints): Promise<PartyTheme> {
    // Verify the party exists
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    // Validate constraints
    this.validateConstraints(constraints);

    // Generate a unique ID for the custom theme
    const themeId = uuidv4();

    // Create a name based on constraints
    const themeName = this.generateCustomThemeName(constraints);

    // Create the custom theme in the database
    const dbTheme = await prisma.partyTheme.create({
      data: {
        id: themeId,
        name: themeName,
        description: 'Custom theme with specific constraints',
        icon: '🎨',
        constraints: JSON.stringify(constraints),
        isCustom: true,
      },
    });

    // Return the created theme
    const customTheme: PartyTheme = {
      id: dbTheme.id,
      name: dbTheme.name,
      description: dbTheme.description,
      icon: dbTheme.icon,
      constraints: JSON.parse(dbTheme.constraints),
      isCustom: dbTheme.isCustom,
    };

    return customTheme;
  }

  /**
   * Validates theme constraints.
   * 
   * @param constraints - The constraints to validate
   * @throws AppError if constraints are invalid
   */
  private validateConstraints(constraints: ThemeConstraints): void {
    // Validate BPM range if provided
    if (constraints.bpmRange) {
      if (typeof constraints.bpmRange.min !== 'number' || typeof constraints.bpmRange.max !== 'number') {
        throw new AppError(ClientErrorCode.INVALID_CONSTRAINTS, 'BPM range must have numeric min and max values');
      }
      if (constraints.bpmRange.min < 0 || constraints.bpmRange.max < 0) {
        throw new AppError(ClientErrorCode.INVALID_CONSTRAINTS, 'BPM values cannot be negative');
      }
      if (constraints.bpmRange.min > constraints.bpmRange.max) {
        throw new AppError(ClientErrorCode.INVALID_CONSTRAINTS, 'BPM min cannot be greater than max');
      }
    }

    // Validate genres if provided
    if (constraints.genres && !Array.isArray(constraints.genres)) {
      throw new AppError(ClientErrorCode.INVALID_CONSTRAINTS, 'Genres must be an array');
    }

    // Validate decades if provided
    if (constraints.decades && !Array.isArray(constraints.decades)) {
      throw new AppError(ClientErrorCode.INVALID_CONSTRAINTS, 'Decades must be an array');
    }

    // Validate moods if provided
    if (constraints.moods && !Array.isArray(constraints.moods)) {
      throw new AppError(ClientErrorCode.INVALID_CONSTRAINTS, 'Moods must be an array');
    }

    // Validate explicit if provided
    if (constraints.explicit !== undefined && constraints.explicit !== null && typeof constraints.explicit !== 'boolean') {
      throw new AppError(ClientErrorCode.INVALID_CONSTRAINTS, 'Explicit must be a boolean or null');
    }
  }

  /**
   * Generates a name for a custom theme based on its constraints.
   * 
   * @param constraints - The theme constraints
   * @returns A generated theme name
   */
  private generateCustomThemeName(constraints: ThemeConstraints): string {
    const parts: string[] = [];

    if (constraints.genres && constraints.genres.length > 0) {
      parts.push(constraints.genres.slice(0, 2).join('/'));
    }

    if (constraints.decades && constraints.decades.length > 0) {
      parts.push(constraints.decades[0]);
    }

    if (constraints.moods && constraints.moods.length > 0) {
      parts.push(constraints.moods[0]);
    }

    if (constraints.bpmRange) {
      parts.push(`${constraints.bpmRange.min}-${constraints.bpmRange.max} BPM`);
    }

    if (parts.length === 0) {
      return 'Custom Theme';
    }

    return `Custom: ${parts.join(' • ')}`;
  }

  /**
   * Gets all predefined round themes.
   * 
   * **Validates: Requirement 7.1**
   * - THE Theme_System SHALL provide at least 12 predefined Round_Themes
   * 
   * @returns Array of predefined round themes
   */
  getRoundThemes(): RoundTheme[] {
    return ROUND_THEMES;
  }

  /**
   * Assigns a round theme to a round.
   * 
   * **Validates: Requirement 7.2**
   * - WHEN a round begins, THE Theme_System SHALL reveal the Round_Theme to all players
   * 
   * @param roundId - The ID of the round
   * @param themeId - The ID of the theme to assign
   * @throws AppError if round does not exist (ROUND_NOT_FOUND)
   * @throws AppError if theme does not exist (THEME_NOT_FOUND)
   */
  async assignRoundTheme(roundId: string, themeId: string): Promise<void> {
    // Verify the round exists
    const roundRecord = await prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!roundRecord) {
      throw new AppError(ClientErrorCode.ROUND_NOT_FOUND, 'Round does not exist');
    }

    // Check if theme is a predefined theme
    const predefinedTheme = ROUND_THEMES.find(t => t.id === themeId);

    if (predefinedTheme) {
      // For predefined themes, ensure it exists in the database or create it
      let dbTheme = await prisma.roundTheme.findUnique({
        where: { id: themeId },
      });

      if (!dbTheme) {
        // Create the predefined theme in the database
        dbTheme = await prisma.roundTheme.create({
          data: {
            id: predefinedTheme.id,
            name: predefinedTheme.name,
            prompt: predefinedTheme.prompt,
            votingPrompt: predefinedTheme.votingPrompt,
            icon: predefinedTheme.icon,
            bonusMultiplier: predefinedTheme.bonusMultiplier,
          },
        });
      }

      // Update the round with the theme
      await prisma.round.update({
        where: { id: roundId },
        data: { themeId },
      });
    } else {
      // Check if it's a custom theme in the database
      const customTheme = await prisma.roundTheme.findUnique({
        where: { id: themeId },
      });

      if (!customTheme) {
        throw new AppError(ClientErrorCode.THEME_NOT_FOUND, 'Theme does not exist');
      }

      // Update the round with the custom theme
      await prisma.round.update({
        where: { id: roundId },
        data: { themeId },
      });
    }
  }

  /**
   * Gets a random round theme, optionally excluding certain themes.
   * 
   * **Validates: Requirement 7.3**
   * - THE Theme_System SHALL support three round theme modes: random, host-picks, and player-vote
   * 
   * @param excludeIds - Optional array of theme IDs to exclude
   * @returns A random round theme
   */
  getRandomRoundTheme(excludeIds?: string[]): RoundTheme {
    // Filter out excluded themes
    let availableThemes = ROUND_THEMES;
    
    if (excludeIds && excludeIds.length > 0) {
      availableThemes = ROUND_THEMES.filter(t => !excludeIds.includes(t.id));
    }

    // If all themes are excluded, use the full list
    if (availableThemes.length === 0) {
      availableThemes = ROUND_THEMES;
    }

    // Select a random theme
    const randomIndex = Math.floor(Math.random() * availableThemes.length);
    return availableThemes[randomIndex];
  }

  /**
   * Records a theme adherence rating for a vote.
   * 
   * **Validates: Requirement 8.1, 8.2, 8.4**
   * - 8.1: WHEN voting on a song with an active Round_Theme, THE Voting_System SHALL display a theme adherence slider (1-5)
   * - 8.2: THE Voting_System SHALL make theme adherence voting optional but encouraged
   * - 8.4: THE Vote model SHALL store the theme adherence rating separately from the main rating
   * 
   * @param voteId - The ID of the vote
   * @param rating - The theme adherence rating (1-5)
   * @throws AppError if vote does not exist (VOTE_NOT_FOUND)
   * @throws AppError if rating is invalid (INVALID_ADHERENCE_RATING)
   */
  async recordThemeAdherence(voteId: string, rating: number): Promise<void> {
    // Validate rating is between 1 and 5
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError(ClientErrorCode.INVALID_ADHERENCE_RATING, 'Theme adherence rating must be between 1 and 5');
    }

    // Verify the vote exists
    const voteRecord = await prisma.vote.findUnique({
      where: { id: voteId },
    });

    if (!voteRecord) {
      throw new AppError(ClientErrorCode.VOTE_NOT_FOUND, 'Vote does not exist');
    }

    // Update the vote with the theme adherence rating
    await prisma.vote.update({
      where: { id: voteId },
      data: { themeAdherenceRating: rating },
    });
  }

  /**
   * Calculates the theme bonus for a song based on theme adherence ratings.
   * 
   * **Validates: Requirement 7.4, 8.3**
   * - 7.4: WHEN a Round_Theme has a bonus multiplier, THE Scoring_System SHALL apply that multiplier to theme adherence bonuses
   * - 8.3: WHEN a song receives an average theme adherence rating of 4 or higher, THE Scoring_System SHALL apply a +0.5 theme bonus
   * 
   * **Property 5: Theme Bonus Calculation**
   * For any song with votes that include theme adherence ratings, if the average theme adherence rating is >= 4,
   * the theme bonus SHALL be 0.5 multiplied by the Round_Theme's bonusMultiplier (default 1.0), otherwise the theme bonus SHALL be 0.
   * 
   * @param songId - The ID of the song
   * @returns The calculated theme bonus
   * @throws AppError if song does not exist (SONG_NOT_FOUND)
   */
  async calculateThemeBonus(songId: string): Promise<number> {
    // Verify the song exists
    const songRecord = await prisma.song.findUnique({
      where: { id: songId },
      include: {
        round: {
          include: {
            theme: true,
          },
        },
        votes: true,
      },
    });

    if (!songRecord) {
      throw new AppError(ClientErrorCode.SONG_NOT_FOUND, 'Song does not exist');
    }

    // Get votes with theme adherence ratings
    const votesWithAdherence = songRecord.votes.filter(v => v.themeAdherenceRating !== null);

    // If no votes have theme adherence ratings, return 0
    if (votesWithAdherence.length === 0) {
      return 0;
    }

    // Calculate average theme adherence rating
    const totalAdherence = votesWithAdherence.reduce((sum, v) => sum + (v.themeAdherenceRating ?? 0), 0);
    const averageAdherence = totalAdherence / votesWithAdherence.length;

    // Requirement 8.3: If average is >= 4, apply +0.5 bonus
    if (averageAdherence >= 4) {
      // Get the bonus multiplier from the round theme (default 1.0)
      const bonusMultiplier = songRecord.round?.theme?.bonusMultiplier ?? 1.0;
      
      // Requirement 7.4: Apply the bonus multiplier to the theme bonus
      return 0.5 * bonusMultiplier;
    }

    return 0;
  }

  /**
   * Gets a party theme by ID.
   * 
   * @param themeId - The ID of the theme
   * @returns The party theme if found, null otherwise
   */
  async getPartyTheme(themeId: string): Promise<PartyTheme | null> {
    // First check predefined themes
    const predefinedTheme = PARTY_THEMES.find(t => t.id === themeId);
    if (predefinedTheme) {
      return predefinedTheme;
    }

    // Check database for custom themes
    const dbTheme = await prisma.partyTheme.findUnique({
      where: { id: themeId },
    });

    if (!dbTheme) {
      return null;
    }

    return {
      id: dbTheme.id,
      name: dbTheme.name,
      description: dbTheme.description,
      icon: dbTheme.icon,
      constraints: JSON.parse(dbTheme.constraints),
      isCustom: dbTheme.isCustom,
    };
  }

  /**
   * Gets a round theme by ID.
   * 
   * @param themeId - The ID of the theme
   * @returns The round theme if found, null otherwise
   */
  async getRoundTheme(themeId: string): Promise<RoundTheme | null> {
    // First check predefined themes
    const predefinedTheme = ROUND_THEMES.find(t => t.id === themeId);
    if (predefinedTheme) {
      return predefinedTheme;
    }

    // Check database for custom themes
    const dbTheme = await prisma.roundTheme.findUnique({
      where: { id: themeId },
    });

    if (!dbTheme) {
      return null;
    }

    return {
      id: dbTheme.id,
      name: dbTheme.name,
      prompt: dbTheme.prompt,
      votingPrompt: dbTheme.votingPrompt,
      icon: dbTheme.icon,
      bonusMultiplier: dbTheme.bonusMultiplier,
    };
  }

  /**
   * Gets the party theme for a specific party.
   * 
   * @param partyId - The ID of the party
   * @returns The party theme if set, null otherwise
   * @throws AppError if party does not exist (PARTY_NOT_FOUND)
   */
  async getPartyThemeForParty(partyId: string): Promise<PartyTheme | null> {
    const partyRecord = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        partyTheme: true,
      },
    });

    if (!partyRecord) {
      throw new AppError(ClientErrorCode.PARTY_NOT_FOUND, 'Party does not exist');
    }

    if (!partyRecord.partyThemeId || !partyRecord.partyTheme) {
      return null;
    }

    return {
      id: partyRecord.partyTheme.id,
      name: partyRecord.partyTheme.name,
      description: partyRecord.partyTheme.description,
      icon: partyRecord.partyTheme.icon,
      constraints: JSON.parse(partyRecord.partyTheme.constraints),
      isCustom: partyRecord.partyTheme.isCustom,
    };
  }

  /**
   * Gets the round theme for a specific round.
   * 
   * @param roundId - The ID of the round
   * @returns The round theme if set, null otherwise
   * @throws AppError if round does not exist (ROUND_NOT_FOUND)
   */
  async getRoundThemeForRound(roundId: string): Promise<RoundTheme | null> {
    const roundRecord = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        theme: true,
      },
    });

    if (!roundRecord) {
      throw new AppError(ClientErrorCode.ROUND_NOT_FOUND, 'Round does not exist');
    }

    if (!roundRecord.themeId || !roundRecord.theme) {
      return null;
    }

    return {
      id: roundRecord.theme.id,
      name: roundRecord.theme.name,
      prompt: roundRecord.theme.prompt,
      votingPrompt: roundRecord.theme.votingPrompt,
      icon: roundRecord.theme.icon,
      bonusMultiplier: roundRecord.theme.bonusMultiplier,
    };
  }
}

// Export singleton instance
export const themeService = new ThemeService();
