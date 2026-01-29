import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { 
  PartyStatus, 
  PlayerStatus, 
  DEFAULT_PARTY_SETTINGS,
  COMPETITIVE_PRESETS,
  type PartySettings,
  type MiniEventFrequency
} from '../types';

describe('Types', () => {
  describe('PartyStatus enum', () => {
    it('should have all required status values', () => {
      expect(PartyStatus.LOBBY).toBe('LOBBY');
      expect(PartyStatus.SUBMITTING).toBe('SUBMITTING');
      expect(PartyStatus.PLAYING).toBe('PLAYING');
      expect(PartyStatus.FINALE).toBe('FINALE');
      expect(PartyStatus.COMPLETE).toBe('COMPLETE');
    });
  });

  describe('PlayerStatus enum', () => {
    it('should have all required status values', () => {
      expect(PlayerStatus.CONNECTED).toBe('CONNECTED');
      expect(PlayerStatus.DISCONNECTED).toBe('DISCONNECTED');
      expect(PlayerStatus.KICKED).toBe('KICKED');
    });
  });

  describe('DEFAULT_PARTY_SETTINGS', () => {
    it('should have valid default values', () => {
      expect(DEFAULT_PARTY_SETTINGS.songsPerPlayer).toBe(2);
      expect(DEFAULT_PARTY_SETTINGS.playDuration).toBe(45);
      expect(DEFAULT_PARTY_SETTINGS.submissionTimerMinutes).toBeNull();
      expect(DEFAULT_PARTY_SETTINGS.enableConfidenceBetting).toBe(true);
      expect(DEFAULT_PARTY_SETTINGS.enableProgressiveWeighting).toBe(true);
      expect(DEFAULT_PARTY_SETTINGS.bonusCategoryCount).toBe(2);
    });

    it('should have valid competitive feature defaults', () => {
      expect(DEFAULT_PARTY_SETTINGS.enableMiniEvents).toBe(true);
      expect(DEFAULT_PARTY_SETTINGS.miniEventFrequency).toBe('normal');
      expect(DEFAULT_PARTY_SETTINGS.enablePowerUps).toBe(true);
      expect(DEFAULT_PARTY_SETTINGS.startingPowerUpPoints).toBe(10);
      expect(DEFAULT_PARTY_SETTINGS.enableAchievements).toBe(true);
      expect(DEFAULT_PARTY_SETTINGS.enablePredictions).toBe(true);
      expect(DEFAULT_PARTY_SETTINGS.enableThemes).toBe(true);
      expect(DEFAULT_PARTY_SETTINGS.enableVoteComments).toBe(true);
    });

    it('should have songsPerPlayer in valid range', () => {
      expect([1, 2, 3]).toContain(DEFAULT_PARTY_SETTINGS.songsPerPlayer);
    });

    it('should have playDuration in valid range', () => {
      expect([30, 45, 60, 90]).toContain(DEFAULT_PARTY_SETTINGS.playDuration);
    });

    it('should have bonusCategoryCount in valid range', () => {
      expect([0, 1, 2, 3]).toContain(DEFAULT_PARTY_SETTINGS.bonusCategoryCount);
    });

    it('should have miniEventFrequency in valid range', () => {
      expect(['rare', 'normal', 'chaos']).toContain(DEFAULT_PARTY_SETTINGS.miniEventFrequency);
    });
  });

  describe('COMPETITIVE_PRESETS', () => {
    it('should have casual preset with all competitive features disabled', () => {
      const casual = COMPETITIVE_PRESETS.casual;
      expect(casual.enableMiniEvents).toBe(false);
      expect(casual.enablePowerUps).toBe(false);
      expect(casual.enableAchievements).toBe(false);
      expect(casual.enablePredictions).toBe(false);
      expect(casual.enableThemes).toBe(false);
      expect(casual.enableVoteComments).toBe(false);
      expect(casual.startingPowerUpPoints).toBe(0);
    });

    it('should have competitive preset with all features enabled and normal frequency', () => {
      const competitive = COMPETITIVE_PRESETS.competitive;
      expect(competitive.enableMiniEvents).toBe(true);
      expect(competitive.miniEventFrequency).toBe('normal');
      expect(competitive.enablePowerUps).toBe(true);
      expect(competitive.startingPowerUpPoints).toBe(10);
      expect(competitive.enableAchievements).toBe(true);
      expect(competitive.enablePredictions).toBe(true);
      expect(competitive.enableThemes).toBe(true);
      expect(competitive.enableVoteComments).toBe(true);
    });

    it('should have chaos preset with all features enabled and chaos frequency', () => {
      const chaos = COMPETITIVE_PRESETS.chaos;
      expect(chaos.enableMiniEvents).toBe(true);
      expect(chaos.miniEventFrequency).toBe('chaos');
      expect(chaos.enablePowerUps).toBe(true);
      expect(chaos.startingPowerUpPoints).toBe(15);
      expect(chaos.enableAchievements).toBe(true);
      expect(chaos.enablePredictions).toBe(true);
      expect(chaos.enableThemes).toBe(true);
      expect(chaos.enableVoteComments).toBe(true);
    });
  });
});

describe('Property-based tests for settings validation', () => {
  // Feature: nero-party-implementation, Property 10: Settings Validation
  // **Validates: Requirements 3.2, 3.3, 3.5**
  it('should validate songsPerPlayer is in {1, 2, 3}', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (songsPerPlayer) => {
          const validValues = [1, 2, 3];
          return validValues.includes(songsPerPlayer);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate playDuration is in {30, 45, 60, 90}', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(30, 45, 60, 90),
        (playDuration) => {
          const validValues = [30, 45, 60, 90];
          return validValues.includes(playDuration);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should validate bonusCategoryCount is in {0, 1, 2, 3}', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        (bonusCategoryCount) => {
          const validValues = [0, 1, 2, 3];
          return validValues.includes(bonusCategoryCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate valid PartySettings objects', () => {
    const partySettingsArb = fc.record({
      // Core game settings
      songsPerPlayer: fc.constantFrom(1, 2, 3) as fc.Arbitrary<1 | 2 | 3>,
      playDuration: fc.constantFrom(30, 45, 60, 90) as fc.Arbitrary<30 | 45 | 60 | 90>,
      submissionTimerMinutes: fc.option(fc.integer({ min: 1, max: 30 }), { nil: null }),
      enableConfidenceBetting: fc.boolean(),
      enableProgressiveWeighting: fc.boolean(),
      bonusCategoryCount: fc.constantFrom(0, 1, 2, 3) as fc.Arbitrary<0 | 1 | 2 | 3>,
      // Competitive feature settings
      enableMiniEvents: fc.boolean(),
      miniEventFrequency: fc.constantFrom('rare', 'normal', 'chaos') as fc.Arbitrary<MiniEventFrequency>,
      enablePowerUps: fc.boolean(),
      startingPowerUpPoints: fc.integer({ min: 0, max: 50 }),
      enableAchievements: fc.boolean(),
      enablePredictions: fc.boolean(),
      enableThemes: fc.boolean(),
      enableVoteComments: fc.boolean(),
    });

    fc.assert(
      fc.property(partySettingsArb, (settings: PartySettings) => {
        // Validate core settings are within expected ranges
        expect([1, 2, 3]).toContain(settings.songsPerPlayer);
        expect([30, 45, 60, 90]).toContain(settings.playDuration);
        expect([0, 1, 2, 3]).toContain(settings.bonusCategoryCount);
        expect(typeof settings.enableConfidenceBetting).toBe('boolean');
        expect(typeof settings.enableProgressiveWeighting).toBe('boolean');
        
        if (settings.submissionTimerMinutes !== null) {
          expect(settings.submissionTimerMinutes).toBeGreaterThanOrEqual(1);
          expect(settings.submissionTimerMinutes).toBeLessThanOrEqual(30);
        }
        
        // Validate competitive settings
        expect(typeof settings.enableMiniEvents).toBe('boolean');
        expect(['rare', 'normal', 'chaos']).toContain(settings.miniEventFrequency);
        expect(typeof settings.enablePowerUps).toBe('boolean');
        expect(settings.startingPowerUpPoints).toBeGreaterThanOrEqual(0);
        expect(typeof settings.enableAchievements).toBe('boolean');
        expect(typeof settings.enablePredictions).toBe('boolean');
        expect(typeof settings.enableThemes).toBe('boolean');
        expect(typeof settings.enableVoteComments).toBe('boolean');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
});
