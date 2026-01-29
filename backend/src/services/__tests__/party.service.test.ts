import { PrismaClient } from '@prisma/client';
import { PartyService, partyService } from '../party.service';
import { PartyStatus } from '../../types';

// Create a test database client
const prisma = new PrismaClient();

describe('PartyService', () => {
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

  describe('generateCode', () => {
    it('should generate a 4-character code', async () => {
      const code = await partyService.generateCode();
      
      expect(code).toHaveLength(4);
    });

    it('should generate uppercase alphanumeric codes only', async () => {
      const code = await partyService.generateCode();
      
      // Should match pattern: only uppercase letters and digits
      expect(code).toMatch(/^[A-Z0-9]{4}$/);
    });

    it('should generate unique codes across multiple calls', async () => {
      const codes = new Set<string>();
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        const code = await partyService.generateCode();
        codes.add(code);
      }

      // All codes should be unique (very high probability with 36^4 possibilities)
      expect(codes.size).toBe(iterations);
    });

    it('should not conflict with active party codes', async () => {
      // Create an active party with a known code
      const existingCode = 'TEST';
      await prisma.party.create({
        data: {
          id: 'test-party-id',
          code: existingCode,
          status: PartyStatus.LOBBY,
          hostId: 'test-host-id',
          settings: '{}',
        },
      });

      // Generate multiple codes and ensure none match the existing code
      for (let i = 0; i < 20; i++) {
        const code = await partyService.generateCode();
        expect(code).not.toBe(existingCode);
      }
    });

    it('should allow reuse of codes from COMPLETE parties', async () => {
      // Create a completed party with a known code
      const completedCode = 'DONE';
      await prisma.party.create({
        data: {
          id: 'completed-party-id',
          code: completedCode,
          status: PartyStatus.COMPLETE,
          hostId: 'test-host-id',
          settings: '{}',
          completedAt: new Date(),
        },
      });

      // The code should be available for reuse
      const isAvailable = await partyService.isCodeAvailable(completedCode);
      expect(isAvailable).toBe(true);
    });

    it('should not allow reuse of codes from LOBBY parties', async () => {
      const activeCode = 'ACTV';
      await prisma.party.create({
        data: {
          id: 'active-party-id',
          code: activeCode,
          status: PartyStatus.LOBBY,
          hostId: 'test-host-id',
          settings: '{}',
        },
      });

      const isAvailable = await partyService.isCodeAvailable(activeCode);
      expect(isAvailable).toBe(false);
    });

    it('should not allow reuse of codes from SUBMITTING parties', async () => {
      const activeCode = 'SUBM';
      await prisma.party.create({
        data: {
          id: 'submitting-party-id',
          code: activeCode,
          status: PartyStatus.SUBMITTING,
          hostId: 'test-host-id',
          settings: '{}',
        },
      });

      const isAvailable = await partyService.isCodeAvailable(activeCode);
      expect(isAvailable).toBe(false);
    });

    it('should not allow reuse of codes from PLAYING parties', async () => {
      const activeCode = 'PLAY';
      await prisma.party.create({
        data: {
          id: 'playing-party-id',
          code: activeCode,
          status: PartyStatus.PLAYING,
          hostId: 'test-host-id',
          settings: '{}',
        },
      });

      const isAvailable = await partyService.isCodeAvailable(activeCode);
      expect(isAvailable).toBe(false);
    });

    it('should not allow reuse of codes from FINALE parties', async () => {
      const activeCode = 'FINL';
      await prisma.party.create({
        data: {
          id: 'finale-party-id',
          code: activeCode,
          status: PartyStatus.FINALE,
          hostId: 'test-host-id',
          settings: '{}',
        },
      });

      const isAvailable = await partyService.isCodeAvailable(activeCode);
      expect(isAvailable).toBe(false);
    });
  });

  describe('createParty', () => {
    it('should create a party with a unique code', async () => {
      const { party } = await partyService.createParty('TestHost');

      expect(party.code).toHaveLength(4);
      expect(party.code).toMatch(/^[A-Z0-9]{4}$/);
    });

    it('should create a party in LOBBY status', async () => {
      const { party } = await partyService.createParty('TestHost');

      expect(party.status).toBe(PartyStatus.LOBBY);
    });

    it('should designate the creator as host', async () => {
      const { party, host } = await partyService.createParty('TestHost');

      expect(host.isHost).toBe(true);
      expect(party.hostId).toBe(host.id);
    });

    it('should use default settings when none provided', async () => {
      const { party } = await partyService.createParty('TestHost');

      expect(party.settings.songsPerPlayer).toBe(2);
      expect(party.settings.playDuration).toBe(45);
      expect(party.settings.enableConfidenceBetting).toBe(true);
      expect(party.settings.enableProgressiveWeighting).toBe(true);
      expect(party.settings.bonusCategoryCount).toBe(2);
    });

    it('should allow custom settings', async () => {
      const { party } = await partyService.createParty('TestHost', {
        songsPerPlayer: 3,
        playDuration: 60,
        bonusCategoryCount: 1,
      });

      expect(party.settings.songsPerPlayer).toBe(3);
      expect(party.settings.playDuration).toBe(60);
      expect(party.settings.bonusCategoryCount).toBe(1);
      // Defaults should still apply for unspecified settings
      expect(party.settings.enableConfidenceBetting).toBe(true);
    });

    it('should persist party to database', async () => {
      const { party } = await partyService.createParty('TestHost');

      const dbParty = await prisma.party.findUnique({
        where: { id: party.id },
      });

      expect(dbParty).not.toBeNull();
      expect(dbParty?.code).toBe(party.code);
    });

    it('should persist host player to database', async () => {
      const { host } = await partyService.createParty('TestHost');

      const dbPlayer = await prisma.player.findUnique({
        where: { id: host.id },
      });

      expect(dbPlayer).not.toBeNull();
      expect(dbPlayer?.name).toBe('TestHost');
      expect(dbPlayer?.isHost).toBe(true);
    });
  });

  describe('getPartyByCode', () => {
    it('should return party when code exists', async () => {
      const { party: createdParty } = await partyService.createParty('TestHost');

      const foundParty = await partyService.getPartyByCode(createdParty.code);

      expect(foundParty).not.toBeNull();
      expect(foundParty?.id).toBe(createdParty.id);
    });

    it('should return null when code does not exist', async () => {
      const foundParty = await partyService.getPartyByCode('XXXX');

      expect(foundParty).toBeNull();
    });
  });

  describe('getParty', () => {
    it('should return party when ID exists', async () => {
      const { party: createdParty } = await partyService.createParty('TestHost');

      const foundParty = await partyService.getParty(createdParty.id);

      expect(foundParty).not.toBeNull();
      expect(foundParty?.code).toBe(createdParty.code);
    });

    it('should return null when ID does not exist', async () => {
      const foundParty = await partyService.getParty('non-existent-id');

      expect(foundParty).toBeNull();
    });
  });

  describe('joinParty', () => {
    /**
     * Tests for Requirement 1.3:
     * WHEN a user provides a valid party code, THE Backend SHALL add them to the corresponding Party
     */
    describe('valid party code (Requirement 1.3)', () => {
      it('should add player to party when code is valid', async () => {
        const { party } = await partyService.createParty('TestHost');

        const { party: joinedParty, player } = await partyService.joinParty(
          party.code,
          'NewPlayer'
        );

        expect(joinedParty.id).toBe(party.id);
        expect(player.name).toBe('NewPlayer');
        expect(player.partyId).toBe(party.id);
      });

      it('should create player with isHost = false', async () => {
        const { party } = await partyService.createParty('TestHost');

        const { player } = await partyService.joinParty(party.code, 'NewPlayer');

        expect(player.isHost).toBe(false);
      });

      it('should create player with CONNECTED status', async () => {
        const { party } = await partyService.createParty('TestHost');

        const { player } = await partyService.joinParty(party.code, 'NewPlayer');

        expect(player.status).toBe('CONNECTED');
      });

      it('should persist player to database', async () => {
        const { party } = await partyService.createParty('TestHost');

        const { player } = await partyService.joinParty(party.code, 'NewPlayer');

        const dbPlayer = await prisma.player.findUnique({
          where: { id: player.id },
        });

        expect(dbPlayer).not.toBeNull();
        expect(dbPlayer?.name).toBe('NewPlayer');
        expect(dbPlayer?.partyId).toBe(party.id);
      });

      it('should allow multiple players to join the same party', async () => {
        const { party } = await partyService.createParty('TestHost');

        const { player: player1 } = await partyService.joinParty(party.code, 'Player1');
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        const { player: player3 } = await partyService.joinParty(party.code, 'Player3');

        expect(player1.partyId).toBe(party.id);
        expect(player2.partyId).toBe(party.id);
        expect(player3.partyId).toBe(party.id);

        // Verify all players are in the database
        const players = await prisma.player.findMany({
          where: { partyId: party.id },
        });
        expect(players).toHaveLength(4); // Host + 3 players
      });

      it('should return the correct party data', async () => {
        const { party: createdParty } = await partyService.createParty('TestHost', {
          songsPerPlayer: 3,
          playDuration: 60,
        });

        const { party: joinedParty } = await partyService.joinParty(
          createdParty.code,
          'NewPlayer'
        );

        expect(joinedParty.code).toBe(createdParty.code);
        expect(joinedParty.status).toBe(PartyStatus.LOBBY);
        expect(joinedParty.settings.songsPerPlayer).toBe(3);
        expect(joinedParty.settings.playDuration).toBe(60);
      });
    });

    /**
     * Tests for Requirement 1.4:
     * WHEN a user provides an invalid party code, THE Backend SHALL return an error message indicating the party does not exist
     */
    describe('invalid party code (Requirement 1.4)', () => {
      it('should throw error when party code does not exist', async () => {
        await expect(
          partyService.joinParty('XXXX', 'NewPlayer')
        ).rejects.toThrow('Party does not exist');
      });

      it('should throw error with PARTY_NOT_FOUND code', async () => {
        try {
          await partyService.joinParty('XXXX', 'NewPlayer');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PARTY_NOT_FOUND');
        }
      });

      it('should throw error for empty code', async () => {
        await expect(
          partyService.joinParty('', 'NewPlayer')
        ).rejects.toThrow('Party does not exist');
      });
    });

    /**
     * Tests for Requirement 1.6:
     * WHEN a Player joins a Party, THE Backend SHALL reject the request if Party status is not LOBBY
     */
    describe('party state validation (Requirement 1.6)', () => {
      it('should reject join when party is in SUBMITTING state', async () => {
        // Create party and manually update status to SUBMITTING
        const { party } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await expect(
          partyService.joinParty(party.code, 'NewPlayer')
        ).rejects.toThrow('Party has already started');
      });

      it('should reject join when party is in PLAYING state', async () => {
        const { party } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.PLAYING },
        });

        await expect(
          partyService.joinParty(party.code, 'NewPlayer')
        ).rejects.toThrow('Party has already started');
      });

      it('should reject join when party is in FINALE state', async () => {
        const { party } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.FINALE },
        });

        await expect(
          partyService.joinParty(party.code, 'NewPlayer')
        ).rejects.toThrow('Party has already started');
      });

      it('should reject join when party is in COMPLETE state', async () => {
        const { party } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.COMPLETE, completedAt: new Date() },
        });

        await expect(
          partyService.joinParty(party.code, 'NewPlayer')
        ).rejects.toThrow('Party has already started');
      });

      it('should throw error with PARTY_STARTED code for non-LOBBY state', async () => {
        const { party } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.PLAYING },
        });

        try {
          await partyService.joinParty(party.code, 'NewPlayer');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PARTY_STARTED');
        }
      });

      it('should allow join when party is in LOBBY state', async () => {
        const { party } = await partyService.createParty('TestHost');

        // Party should be in LOBBY state by default
        expect(party.status).toBe(PartyStatus.LOBBY);

        const { player } = await partyService.joinParty(party.code, 'NewPlayer');

        expect(player.partyId).toBe(party.id);
      });
    });
  });

  describe('updateSettings', () => {
    /**
     * Tests for Requirement 3.1:
     * WHILE the Party status is LOBBY, THE Host SHALL be able to modify game settings
     */
    describe('host can modify settings in LOBBY state (Requirement 3.1)', () => {
      it('should allow host to update songsPerPlayer', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          songsPerPlayer: 3,
        });

        expect(updatedParty.settings.songsPerPlayer).toBe(3);
      });

      it('should allow host to update playDuration', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          playDuration: 90,
        });

        expect(updatedParty.settings.playDuration).toBe(90);
      });

      it('should allow host to update bonusCategoryCount', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          bonusCategoryCount: 0,
        });

        expect(updatedParty.settings.bonusCategoryCount).toBe(0);
      });

      it('should allow host to update enableConfidenceBetting', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          enableConfidenceBetting: false,
        });

        expect(updatedParty.settings.enableConfidenceBetting).toBe(false);
      });

      it('should allow host to update multiple settings at once', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          songsPerPlayer: 1,
          playDuration: 30,
          bonusCategoryCount: 3,
          enableConfidenceBetting: false,
        });

        expect(updatedParty.settings.songsPerPlayer).toBe(1);
        expect(updatedParty.settings.playDuration).toBe(30);
        expect(updatedParty.settings.bonusCategoryCount).toBe(3);
        expect(updatedParty.settings.enableConfidenceBetting).toBe(false);
      });

      it('should preserve unmodified settings', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 2,
          playDuration: 45,
          bonusCategoryCount: 2,
          enableConfidenceBetting: true,
        });

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          songsPerPlayer: 3,
        });

        expect(updatedParty.settings.songsPerPlayer).toBe(3);
        expect(updatedParty.settings.playDuration).toBe(45);
        expect(updatedParty.settings.bonusCategoryCount).toBe(2);
        expect(updatedParty.settings.enableConfidenceBetting).toBe(true);
      });

      it('should persist settings to database', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        await partyService.updateSettings(party.id, host.id, {
          songsPerPlayer: 3,
          playDuration: 60,
        });

        const dbParty = await prisma.party.findUnique({
          where: { id: party.id },
        });
        const settings = JSON.parse(dbParty!.settings);

        expect(settings.songsPerPlayer).toBe(3);
        expect(settings.playDuration).toBe(60);
      });
    });

    /**
     * Tests for Requirement 3.2:
     * WHEN the Host modifies settings, THE Backend SHALL validate that songs_per_player is 1, 2, or 3
     */
    describe('songsPerPlayer validation (Requirement 3.2)', () => {
      it('should accept songsPerPlayer = 1', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          songsPerPlayer: 1,
        });

        expect(updatedParty.settings.songsPerPlayer).toBe(1);
      });

      it('should accept songsPerPlayer = 2', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          songsPerPlayer: 2,
        });

        expect(updatedParty.settings.songsPerPlayer).toBe(2);
      });

      it('should accept songsPerPlayer = 3', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          songsPerPlayer: 3,
        });

        expect(updatedParty.settings.songsPerPlayer).toBe(3);
      });

      it('should reject songsPerPlayer = 0', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        await expect(
          partyService.updateSettings(party.id, host.id, {
            songsPerPlayer: 0 as any,
          })
        ).rejects.toThrow('songsPerPlayer must be 1, 2, or 3');
      });

      it('should reject songsPerPlayer = 4', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        await expect(
          partyService.updateSettings(party.id, host.id, {
            songsPerPlayer: 4 as any,
          })
        ).rejects.toThrow('songsPerPlayer must be 1, 2, or 3');
      });

      it('should reject negative songsPerPlayer', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        await expect(
          partyService.updateSettings(party.id, host.id, {
            songsPerPlayer: -1 as any,
          })
        ).rejects.toThrow('songsPerPlayer must be 1, 2, or 3');
      });

      it('should throw error with INVALID_SETTINGS code for invalid songsPerPlayer', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        try {
          await partyService.updateSettings(party.id, host.id, {
            songsPerPlayer: 5 as any,
          });
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('INVALID_SETTINGS');
          expect(error.field).toBe('songsPerPlayer');
        }
      });
    });

    /**
     * Tests for Requirement 3.3:
     * WHEN the Host modifies settings, THE Backend SHALL validate that play_duration is 30, 45, 60, or 90 seconds
     */
    describe('playDuration validation (Requirement 3.3)', () => {
      it('should accept playDuration = 30', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          playDuration: 30,
        });

        expect(updatedParty.settings.playDuration).toBe(30);
      });

      it('should accept playDuration = 45', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          playDuration: 45,
        });

        expect(updatedParty.settings.playDuration).toBe(45);
      });

      it('should accept playDuration = 60', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          playDuration: 60,
        });

        expect(updatedParty.settings.playDuration).toBe(60);
      });

      it('should accept playDuration = 90', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          playDuration: 90,
        });

        expect(updatedParty.settings.playDuration).toBe(90);
      });

      it('should reject playDuration = 15', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        await expect(
          partyService.updateSettings(party.id, host.id, {
            playDuration: 15 as any,
          })
        ).rejects.toThrow('playDuration must be 30, 45, 60, or 90 seconds');
      });

      it('should reject playDuration = 120', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        await expect(
          partyService.updateSettings(party.id, host.id, {
            playDuration: 120 as any,
          })
        ).rejects.toThrow('playDuration must be 30, 45, 60, or 90 seconds');
      });

      it('should reject playDuration = 0', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        await expect(
          partyService.updateSettings(party.id, host.id, {
            playDuration: 0 as any,
          })
        ).rejects.toThrow('playDuration must be 30, 45, 60, or 90 seconds');
      });

      it('should throw error with INVALID_SETTINGS code for invalid playDuration', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        try {
          await partyService.updateSettings(party.id, host.id, {
            playDuration: 100 as any,
          });
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('INVALID_SETTINGS');
          expect(error.field).toBe('playDuration');
        }
      });
    });

    /**
     * Tests for Requirement 3.4:
     * WHEN the Host modifies settings, THE Backend SHALL allow enabling or disabling confidence_betting
     */
    describe('enableConfidenceBetting (Requirement 3.4)', () => {
      it('should allow enabling confidence betting', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          enableConfidenceBetting: false,
        });

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          enableConfidenceBetting: true,
        });

        expect(updatedParty.settings.enableConfidenceBetting).toBe(true);
      });

      it('should allow disabling confidence betting', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          enableConfidenceBetting: true,
        });

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          enableConfidenceBetting: false,
        });

        expect(updatedParty.settings.enableConfidenceBetting).toBe(false);
      });
    });

    /**
     * Tests for Requirement 3.5:
     * WHEN the Host modifies settings, THE Backend SHALL allow selecting 0, 1, 2, or 3 Bonus_Categories
     */
    describe('bonusCategoryCount validation (Requirement 3.5)', () => {
      it('should accept bonusCategoryCount = 0', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          bonusCategoryCount: 0,
        });

        expect(updatedParty.settings.bonusCategoryCount).toBe(0);
      });

      it('should accept bonusCategoryCount = 1', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          bonusCategoryCount: 1,
        });

        expect(updatedParty.settings.bonusCategoryCount).toBe(1);
      });

      it('should accept bonusCategoryCount = 2', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          bonusCategoryCount: 2,
        });

        expect(updatedParty.settings.bonusCategoryCount).toBe(2);
      });

      it('should accept bonusCategoryCount = 3', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        const updatedParty = await partyService.updateSettings(party.id, host.id, {
          bonusCategoryCount: 3,
        });

        expect(updatedParty.settings.bonusCategoryCount).toBe(3);
      });

      it('should reject bonusCategoryCount = 4', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        await expect(
          partyService.updateSettings(party.id, host.id, {
            bonusCategoryCount: 4 as any,
          })
        ).rejects.toThrow('bonusCategoryCount must be 0, 1, 2, or 3');
      });

      it('should reject negative bonusCategoryCount', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        await expect(
          partyService.updateSettings(party.id, host.id, {
            bonusCategoryCount: -1 as any,
          })
        ).rejects.toThrow('bonusCategoryCount must be 0, 1, 2, or 3');
      });

      it('should throw error with INVALID_SETTINGS code for invalid bonusCategoryCount', async () => {
        const { party, host } = await partyService.createParty('TestHost');

        try {
          await partyService.updateSettings(party.id, host.id, {
            bonusCategoryCount: 5 as any,
          });
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('INVALID_SETTINGS');
          expect(error.field).toBe('bonusCategoryCount');
        }
      });
    });

    /**
     * Tests for Requirement 3.7:
     * WHEN a non-Host Player attempts to modify settings, THE Backend SHALL reject the request with an error
     */
    describe('host-only modification (Requirement 3.7)', () => {
      it('should reject settings update from non-host player', async () => {
        const { party } = await partyService.createParty('TestHost');
        const { player: nonHost } = await partyService.joinParty(party.code, 'NonHost');

        await expect(
          partyService.updateSettings(party.id, nonHost.id, {
            songsPerPlayer: 3,
          })
        ).rejects.toThrow('Only the host can modify settings');
      });

      it('should throw error with NOT_HOST code for non-host player', async () => {
        const { party } = await partyService.createParty('TestHost');
        const { player: nonHost } = await partyService.joinParty(party.code, 'NonHost');

        try {
          await partyService.updateSettings(party.id, nonHost.id, {
            songsPerPlayer: 3,
          });
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('NOT_HOST');
        }
      });

      it('should reject settings update from player in different party', async () => {
        const { party: party1 } = await partyService.createParty('Host1');
        const { host: host2 } = await partyService.createParty('Host2');

        await expect(
          partyService.updateSettings(party1.id, host2.id, {
            songsPerPlayer: 3,
          })
        ).rejects.toThrow('Only the host can modify settings');
      });

      it('should throw error for non-existent player', async () => {
        const { party } = await partyService.createParty('TestHost');

        await expect(
          partyService.updateSettings(party.id, 'non-existent-player-id', {
            songsPerPlayer: 3,
          })
        ).rejects.toThrow('Player does not exist');
      });

      it('should throw error with PLAYER_NOT_FOUND code for non-existent player', async () => {
        const { party } = await partyService.createParty('TestHost');

        try {
          await partyService.updateSettings(party.id, 'non-existent-player-id', {
            songsPerPlayer: 3,
          });
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PLAYER_NOT_FOUND');
        }
      });
    });

    /**
     * Tests for state validation:
     * Settings can only be modified in LOBBY state
     */
    describe('state validation', () => {
      it('should reject settings update when party is in SUBMITTING state', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await expect(
          partyService.updateSettings(party.id, host.id, {
            songsPerPlayer: 3,
          })
        ).rejects.toThrow('Settings can only be modified in LOBBY state');
      });

      it('should reject settings update when party is in PLAYING state', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.PLAYING },
        });

        await expect(
          partyService.updateSettings(party.id, host.id, {
            songsPerPlayer: 3,
          })
        ).rejects.toThrow('Settings can only be modified in LOBBY state');
      });

      it('should reject settings update when party is in FINALE state', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.FINALE },
        });

        await expect(
          partyService.updateSettings(party.id, host.id, {
            songsPerPlayer: 3,
          })
        ).rejects.toThrow('Settings can only be modified in LOBBY state');
      });

      it('should reject settings update when party is in COMPLETE state', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.COMPLETE, completedAt: new Date() },
        });

        await expect(
          partyService.updateSettings(party.id, host.id, {
            songsPerPlayer: 3,
          })
        ).rejects.toThrow('Settings can only be modified in LOBBY state');
      });

      it('should throw error with INVALID_STATE code for non-LOBBY state', async () => {
        const { party, host } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.PLAYING },
        });

        try {
          await partyService.updateSettings(party.id, host.id, {
            songsPerPlayer: 3,
          });
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('INVALID_STATE');
        }
      });
    });

    /**
     * Tests for party existence validation
     */
    describe('party existence validation', () => {
      it('should throw error for non-existent party', async () => {
        const { host } = await partyService.createParty('TestHost');

        await expect(
          partyService.updateSettings('non-existent-party-id', host.id, {
            songsPerPlayer: 3,
          })
        ).rejects.toThrow('Party does not exist');
      });

      it('should throw error with PARTY_NOT_FOUND code for non-existent party', async () => {
        const { host } = await partyService.createParty('TestHost');

        try {
          await partyService.updateSettings('non-existent-party-id', host.id, {
            songsPerPlayer: 3,
          });
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PARTY_NOT_FOUND');
        }
      });
    });
  });

  describe('getPlayers', () => {
    it('should return all players in a party', async () => {
      const { party, host } = await partyService.createParty('TestHost');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');

      const players = await partyService.getPlayers(party.id);

      expect(players).toHaveLength(3);
      expect(players.map(p => p.name).sort()).toEqual(['Player2', 'Player3', 'TestHost']);
    });

    it('should return empty array for party with no players', async () => {
      // Create a party directly in the database without a host player
      const partyId = 'test-party-no-players';
      await prisma.party.create({
        data: {
          id: partyId,
          code: 'NPLY',
          status: PartyStatus.LOBBY,
          hostId: 'non-existent-host',
          settings: '{}',
        },
      });

      const players = await partyService.getPlayers(partyId);

      expect(players).toHaveLength(0);
    });
  });

  describe('allPlayersSubmittedSongs', () => {
    /**
     * Tests for Requirement 4.7:
     * WHEN all Players have submitted their required songs, THE Backend SHALL transition the Party to PLAYING state
     */
    it('should return false when no songs have been submitted', async () => {
      const { party } = await partyService.createParty('TestHost', {
        songsPerPlayer: 1,
      });
      await partyService.joinParty(party.code, 'Player2');

      const allSubmitted = await partyService.allPlayersSubmittedSongs(party.id);

      expect(allSubmitted).toBe(false);
    });

    it('should return false when only some players have submitted', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 1,
      });
      await partyService.joinParty(party.code, 'Player2');
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      // Only host submits a song
      await prisma.song.create({
        data: {
          id: 'test-song-1',
          partyId: party.id,
          submitterId: host.id,
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test',
          confidence: 3,
          roundNumber: 1,
          queuePosition: 0,
        },
      });

      const allSubmitted = await partyService.allPlayersSubmittedSongs(party.id);

      expect(allSubmitted).toBe(false);
    });

    it('should return false when players have submitted fewer songs than required', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 2,
      });
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      // Both players submit only 1 song each (need 2)
      await prisma.song.createMany({
        data: [
          {
            id: 'test-song-1',
            partyId: party.id,
            submitterId: host.id,
            soundcloudId: 123456,
            title: 'Host Song 1',
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test1',
            confidence: 3,
            roundNumber: 1,
            queuePosition: 0,
          },
          {
            id: 'test-song-2',
            partyId: party.id,
            submitterId: player2.id,
            soundcloudId: 789012,
            title: 'Player2 Song 1',
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test2',
            confidence: 3,
            roundNumber: 1,
            queuePosition: 0,
          },
        ],
      });

      const allSubmitted = await partyService.allPlayersSubmittedSongs(party.id);

      expect(allSubmitted).toBe(false);
    });

    it('should return true when all players have submitted required songs', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 1,
      });
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      // Both players submit their required song
      await prisma.song.createMany({
        data: [
          {
            id: 'test-song-1',
            partyId: party.id,
            submitterId: host.id,
            soundcloudId: 123456,
            title: 'Host Song',
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test1',
            confidence: 3,
            roundNumber: 1,
            queuePosition: 0,
          },
          {
            id: 'test-song-2',
            partyId: party.id,
            submitterId: player2.id,
            soundcloudId: 789012,
            title: 'Player2 Song',
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test2',
            confidence: 3,
            roundNumber: 1,
            queuePosition: 0,
          },
        ],
      });

      const allSubmitted = await partyService.allPlayersSubmittedSongs(party.id);

      expect(allSubmitted).toBe(true);
    });

    it('should return true when all players have submitted multiple required songs', async () => {
      const { party, host } = await partyService.createParty('TestHost', {
        songsPerPlayer: 2,
      });
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      await prisma.party.update({
        where: { id: party.id },
        data: { status: PartyStatus.SUBMITTING },
      });

      // Both players submit 2 songs each
      await prisma.song.createMany({
        data: [
          {
            id: 'test-song-1',
            partyId: party.id,
            submitterId: host.id,
            soundcloudId: 123456,
            title: 'Host Song 1',
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test1',
            confidence: 3,
            roundNumber: 1,
            queuePosition: 0,
          },
          {
            id: 'test-song-2',
            partyId: party.id,
            submitterId: host.id,
            soundcloudId: 123457,
            title: 'Host Song 2',
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test2',
            confidence: 3,
            roundNumber: 2,
            queuePosition: 0,
          },
          {
            id: 'test-song-3',
            partyId: party.id,
            submitterId: player2.id,
            soundcloudId: 789012,
            title: 'Player2 Song 1',
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test3',
            confidence: 3,
            roundNumber: 1,
            queuePosition: 0,
          },
          {
            id: 'test-song-4',
            partyId: party.id,
            submitterId: player2.id,
            soundcloudId: 789013,
            title: 'Player2 Song 2',
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test4',
            confidence: 3,
            roundNumber: 2,
            queuePosition: 0,
          },
        ],
      });

      const allSubmitted = await partyService.allPlayersSubmittedSongs(party.id);

      expect(allSubmitted).toBe(true);
    });

    it('should return false for non-existent party', async () => {
      const allSubmitted = await partyService.allPlayersSubmittedSongs('non-existent-party');

      expect(allSubmitted).toBe(false);
    });
  });

  describe('transitionToPlaying', () => {
    /**
     * Tests for Requirement 4.7:
     * WHEN all Players have submitted their required songs, THE Backend SHALL transition the Party to PLAYING state
     */
    describe('successful transition (Requirement 4.7)', () => {
      it('should transition party from SUBMITTING to PLAYING when all songs submitted', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 1,
        });
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Both players submit their required song
        await prisma.song.createMany({
          data: [
            {
              id: 'test-song-1',
              partyId: party.id,
              submitterId: host.id,
              soundcloudId: 123456,
              title: 'Host Song',
              artist: 'Test Artist',
              artworkUrl: 'https://example.com/art.jpg',
              duration: 180000,
              permalinkUrl: 'https://soundcloud.com/test1',
              confidence: 3,
              roundNumber: 1,
              queuePosition: 0,
            },
            {
              id: 'test-song-2',
              partyId: party.id,
              submitterId: player2.id,
              soundcloudId: 789012,
              title: 'Player2 Song',
              artist: 'Test Artist',
              artworkUrl: 'https://example.com/art.jpg',
              duration: 180000,
              permalinkUrl: 'https://soundcloud.com/test2',
              confidence: 3,
              roundNumber: 1,
              queuePosition: 0,
            },
          ],
        });

        const updatedParty = await partyService.transitionToPlaying(party.id);

        expect(updatedParty.status).toBe(PartyStatus.PLAYING);
      });

      it('should persist PLAYING status to database', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 1,
        });
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await prisma.song.createMany({
          data: [
            {
              id: 'test-song-1',
              partyId: party.id,
              submitterId: host.id,
              soundcloudId: 123456,
              title: 'Host Song',
              artist: 'Test Artist',
              artworkUrl: 'https://example.com/art.jpg',
              duration: 180000,
              permalinkUrl: 'https://soundcloud.com/test1',
              confidence: 3,
              roundNumber: 1,
              queuePosition: 0,
            },
            {
              id: 'test-song-2',
              partyId: party.id,
              submitterId: player2.id,
              soundcloudId: 789012,
              title: 'Player2 Song',
              artist: 'Test Artist',
              artworkUrl: 'https://example.com/art.jpg',
              duration: 180000,
              permalinkUrl: 'https://soundcloud.com/test2',
              confidence: 3,
              roundNumber: 1,
              queuePosition: 0,
            },
          ],
        });

        await partyService.transitionToPlaying(party.id);

        const dbParty = await prisma.party.findUnique({
          where: { id: party.id },
        });
        expect(dbParty?.status).toBe(PartyStatus.PLAYING);
      });

      it('should work with 3 songs per player', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 3,
        });
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Create 3 songs for each player
        const songs = [];
        for (let i = 1; i <= 3; i++) {
          songs.push({
            id: `host-song-${i}`,
            partyId: party.id,
            submitterId: host.id,
            soundcloudId: 100000 + i,
            title: `Host Song ${i}`,
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: `https://soundcloud.com/host${i}`,
            confidence: 3,
            roundNumber: i,
            queuePosition: 0,
          });
          songs.push({
            id: `player2-song-${i}`,
            partyId: party.id,
            submitterId: player2.id,
            soundcloudId: 200000 + i,
            title: `Player2 Song ${i}`,
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: `https://soundcloud.com/player2${i}`,
            confidence: 3,
            roundNumber: i,
            queuePosition: 0,
          });
        }
        await prisma.song.createMany({ data: songs });

        const updatedParty = await partyService.transitionToPlaying(party.id);

        expect(updatedParty.status).toBe(PartyStatus.PLAYING);
      });
    });

    describe('state validation', () => {
      it('should reject transition when party is in LOBBY state', async () => {
        const { party } = await partyService.createParty('TestHost');
        // Party is in LOBBY state by default

        await expect(
          partyService.transitionToPlaying(party.id)
        ).rejects.toThrow('Party must be in SUBMITTING state to transition to PLAYING');
      });

      it('should reject transition when party is in PLAYING state', async () => {
        const { party } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.PLAYING },
        });

        await expect(
          partyService.transitionToPlaying(party.id)
        ).rejects.toThrow('Party must be in SUBMITTING state to transition to PLAYING');
      });

      it('should reject transition when party is in FINALE state', async () => {
        const { party } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.FINALE },
        });

        await expect(
          partyService.transitionToPlaying(party.id)
        ).rejects.toThrow('Party must be in SUBMITTING state to transition to PLAYING');
      });

      it('should reject transition when party is in COMPLETE state', async () => {
        const { party } = await partyService.createParty('TestHost');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.COMPLETE },
        });

        await expect(
          partyService.transitionToPlaying(party.id)
        ).rejects.toThrow('Party must be in SUBMITTING state to transition to PLAYING');
      });

      it('should throw error with INVALID_STATE code for wrong state', async () => {
        const { party } = await partyService.createParty('TestHost');

        try {
          await partyService.transitionToPlaying(party.id);
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('INVALID_STATE');
        }
      });
    });

    describe('submission validation', () => {
      it('should reject transition when no songs have been submitted', async () => {
        const { party } = await partyService.createParty('TestHost', {
          songsPerPlayer: 1,
        });
        await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        await expect(
          partyService.transitionToPlaying(party.id)
        ).rejects.toThrow('Not all players have submitted their required songs');
      });

      it('should reject transition when only some players have submitted', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 1,
        });
        await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Only host submits
        await prisma.song.create({
          data: {
            id: 'test-song-1',
            partyId: party.id,
            submitterId: host.id,
            soundcloudId: 123456,
            title: 'Host Song',
            artist: 'Test Artist',
            artworkUrl: 'https://example.com/art.jpg',
            duration: 180000,
            permalinkUrl: 'https://soundcloud.com/test1',
            confidence: 3,
            roundNumber: 1,
            queuePosition: 0,
          },
        });

        await expect(
          partyService.transitionToPlaying(party.id)
        ).rejects.toThrow('Not all players have submitted their required songs');
      });

      it('should reject transition when players have submitted fewer songs than required', async () => {
        const { party, host } = await partyService.createParty('TestHost', {
          songsPerPlayer: 2,
        });
        const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        // Both players submit only 1 song each (need 2)
        await prisma.song.createMany({
          data: [
            {
              id: 'test-song-1',
              partyId: party.id,
              submitterId: host.id,
              soundcloudId: 123456,
              title: 'Host Song 1',
              artist: 'Test Artist',
              artworkUrl: 'https://example.com/art.jpg',
              duration: 180000,
              permalinkUrl: 'https://soundcloud.com/test1',
              confidence: 3,
              roundNumber: 1,
              queuePosition: 0,
            },
            {
              id: 'test-song-2',
              partyId: party.id,
              submitterId: player2.id,
              soundcloudId: 789012,
              title: 'Player2 Song 1',
              artist: 'Test Artist',
              artworkUrl: 'https://example.com/art.jpg',
              duration: 180000,
              permalinkUrl: 'https://soundcloud.com/test2',
              confidence: 3,
              roundNumber: 1,
              queuePosition: 0,
            },
          ],
        });

        await expect(
          partyService.transitionToPlaying(party.id)
        ).rejects.toThrow('Not all players have submitted their required songs');
      });

      it('should throw error with SUBMISSIONS_INCOMPLETE code when not all submitted', async () => {
        const { party } = await partyService.createParty('TestHost', {
          songsPerPlayer: 1,
        });
        await partyService.joinParty(party.code, 'Player2');
        await prisma.party.update({
          where: { id: party.id },
          data: { status: PartyStatus.SUBMITTING },
        });

        try {
          await partyService.transitionToPlaying(party.id);
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('SUBMISSIONS_INCOMPLETE');
        }
      });
    });

    describe('party existence validation', () => {
      it('should throw error for non-existent party', async () => {
        await expect(
          partyService.transitionToPlaying('non-existent-party-id')
        ).rejects.toThrow('Party does not exist');
      });

      it('should throw error with PARTY_NOT_FOUND code for non-existent party', async () => {
        try {
          await partyService.transitionToPlaying('non-existent-party-id');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('PARTY_NOT_FOUND');
        }
      });
    });
  });

  /**
   * Tests for cleanupCompletedParties
   * 
   * **Validates: Requirements 15.6**
   * - 15.6: THE Backend SHALL clean up completed Parties older than 24 hours to free resources
   */
  describe('cleanupCompletedParties', () => {
    it('should delete parties with status COMPLETE and completedAt > 24 hours ago', async () => {
      // Create a completed party with completedAt > 24 hours ago
      const oldCompletedAt = new Date();
      oldCompletedAt.setHours(oldCompletedAt.getHours() - 25); // 25 hours ago

      await prisma.party.create({
        data: {
          id: 'old-completed-party',
          code: 'OLD1',
          status: PartyStatus.COMPLETE,
          hostId: 'test-host-id',
          settings: '{}',
          completedAt: oldCompletedAt,
        },
      });

      // Verify party exists before cleanup
      const partyBefore = await prisma.party.findUnique({
        where: { id: 'old-completed-party' },
      });
      expect(partyBefore).not.toBeNull();

      // Run cleanup
      const deletedCount = await partyService.cleanupCompletedParties();

      // Verify party was deleted
      expect(deletedCount).toBe(1);
      const partyAfter = await prisma.party.findUnique({
        where: { id: 'old-completed-party' },
      });
      expect(partyAfter).toBeNull();
    });

    it('should NOT delete parties with status COMPLETE and completedAt < 24 hours ago', async () => {
      // Create a completed party with completedAt < 24 hours ago
      const recentCompletedAt = new Date();
      recentCompletedAt.setHours(recentCompletedAt.getHours() - 23); // 23 hours ago

      await prisma.party.create({
        data: {
          id: 'recent-completed-party',
          code: 'REC1',
          status: PartyStatus.COMPLETE,
          hostId: 'test-host-id',
          settings: '{}',
          completedAt: recentCompletedAt,
        },
      });

      // Run cleanup
      const deletedCount = await partyService.cleanupCompletedParties();

      // Verify party was NOT deleted
      expect(deletedCount).toBe(0);
      const partyAfter = await prisma.party.findUnique({
        where: { id: 'recent-completed-party' },
      });
      expect(partyAfter).not.toBeNull();
    });

    it('should NOT delete parties with status other than COMPLETE', async () => {
      // Create parties in various non-COMPLETE states
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 48); // 48 hours ago

      await prisma.party.create({
        data: {
          id: 'lobby-party',
          code: 'LOB1',
          status: PartyStatus.LOBBY,
          hostId: 'test-host-id',
          settings: '{}',
          createdAt: oldDate,
        },
      });

      await prisma.party.create({
        data: {
          id: 'submitting-party',
          code: 'SUB1',
          status: PartyStatus.SUBMITTING,
          hostId: 'test-host-id',
          settings: '{}',
          createdAt: oldDate,
        },
      });

      await prisma.party.create({
        data: {
          id: 'playing-party',
          code: 'PLY1',
          status: PartyStatus.PLAYING,
          hostId: 'test-host-id',
          settings: '{}',
          createdAt: oldDate,
        },
      });

      await prisma.party.create({
        data: {
          id: 'finale-party',
          code: 'FIN1',
          status: PartyStatus.FINALE,
          hostId: 'test-host-id',
          settings: '{}',
          createdAt: oldDate,
        },
      });

      // Run cleanup
      const deletedCount = await partyService.cleanupCompletedParties();

      // Verify no parties were deleted
      expect(deletedCount).toBe(0);

      // Verify all parties still exist
      expect(await prisma.party.findUnique({ where: { id: 'lobby-party' } })).not.toBeNull();
      expect(await prisma.party.findUnique({ where: { id: 'submitting-party' } })).not.toBeNull();
      expect(await prisma.party.findUnique({ where: { id: 'playing-party' } })).not.toBeNull();
      expect(await prisma.party.findUnique({ where: { id: 'finale-party' } })).not.toBeNull();
    });

    it('should cascade delete related records (players, songs, votes, identities, bonus results)', async () => {
      // Create a completed party with related records
      const oldCompletedAt = new Date();
      oldCompletedAt.setHours(oldCompletedAt.getHours() - 25);

      const partyId = 'cascade-test-party';
      const playerId = 'cascade-test-player';
      const songId = 'cascade-test-song';
      const voteId = 'cascade-test-vote';
      const identityId = 'cascade-test-identity';
      const bonusResultId = 'cascade-test-bonus';

      // Create party
      await prisma.party.create({
        data: {
          id: partyId,
          code: 'CASC',
          status: PartyStatus.COMPLETE,
          hostId: playerId,
          settings: '{}',
          completedAt: oldCompletedAt,
        },
      });

      // Create player
      await prisma.player.create({
        data: {
          id: playerId,
          name: 'Test Player',
          partyId: partyId,
          isHost: true,
          status: 'CONNECTED',
        },
      });

      // Create identity
      await prisma.partyIdentity.create({
        data: {
          id: identityId,
          partyId: partyId,
          playerId: playerId,
          alias: 'Test Alias',
          silhouette: 'circle',
          color: '#FF0000',
        },
      });

      // Create song
      await prisma.song.create({
        data: {
          id: songId,
          partyId: partyId,
          submitterId: playerId,
          soundcloudId: 12345,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test',
          confidence: 3,
          roundNumber: 1,
        },
      });

      // Create vote (need another player for this)
      const voterId = 'cascade-test-voter';
      await prisma.player.create({
        data: {
          id: voterId,
          name: 'Voter',
          partyId: partyId,
          isHost: false,
          status: 'CONNECTED',
        },
      });

      await prisma.vote.create({
        data: {
          id: voteId,
          songId: songId,
          voterId: voterId,
          rating: 8,
        },
      });

      // Create bonus result
      await prisma.bonusResult.create({
        data: {
          id: bonusResultId,
          partyId: partyId,
          categoryId: 'crowd-favorite',
          categoryName: 'Crowd Favorite',
          winningSongId: songId,
          winnerPlayerId: playerId,
          points: 10,
          revealOrder: 1,
        },
      });

      // Verify all records exist before cleanup
      expect(await prisma.party.findUnique({ where: { id: partyId } })).not.toBeNull();
      expect(await prisma.player.findUnique({ where: { id: playerId } })).not.toBeNull();
      expect(await prisma.player.findUnique({ where: { id: voterId } })).not.toBeNull();
      expect(await prisma.partyIdentity.findUnique({ where: { id: identityId } })).not.toBeNull();
      expect(await prisma.song.findUnique({ where: { id: songId } })).not.toBeNull();
      expect(await prisma.vote.findUnique({ where: { id: voteId } })).not.toBeNull();
      expect(await prisma.bonusResult.findUnique({ where: { id: bonusResultId } })).not.toBeNull();

      // Run cleanup
      const deletedCount = await partyService.cleanupCompletedParties();
      expect(deletedCount).toBe(1);

      // Verify all related records were cascade deleted
      expect(await prisma.party.findUnique({ where: { id: partyId } })).toBeNull();
      expect(await prisma.player.findUnique({ where: { id: playerId } })).toBeNull();
      expect(await prisma.player.findUnique({ where: { id: voterId } })).toBeNull();
      expect(await prisma.partyIdentity.findUnique({ where: { id: identityId } })).toBeNull();
      expect(await prisma.song.findUnique({ where: { id: songId } })).toBeNull();
      expect(await prisma.vote.findUnique({ where: { id: voteId } })).toBeNull();
      expect(await prisma.bonusResult.findUnique({ where: { id: bonusResultId } })).toBeNull();
    });

    it('should delete multiple old completed parties at once', async () => {
      const oldCompletedAt = new Date();
      oldCompletedAt.setHours(oldCompletedAt.getHours() - 48);

      // Create multiple old completed parties
      await prisma.party.create({
        data: {
          id: 'old-party-1',
          code: 'OLP1',
          status: PartyStatus.COMPLETE,
          hostId: 'host-1',
          settings: '{}',
          completedAt: oldCompletedAt,
        },
      });

      await prisma.party.create({
        data: {
          id: 'old-party-2',
          code: 'OLP2',
          status: PartyStatus.COMPLETE,
          hostId: 'host-2',
          settings: '{}',
          completedAt: oldCompletedAt,
        },
      });

      await prisma.party.create({
        data: {
          id: 'old-party-3',
          code: 'OLP3',
          status: PartyStatus.COMPLETE,
          hostId: 'host-3',
          settings: '{}',
          completedAt: oldCompletedAt,
        },
      });

      // Run cleanup
      const deletedCount = await partyService.cleanupCompletedParties();

      // Verify all old parties were deleted
      expect(deletedCount).toBe(3);
      expect(await prisma.party.findUnique({ where: { id: 'old-party-1' } })).toBeNull();
      expect(await prisma.party.findUnique({ where: { id: 'old-party-2' } })).toBeNull();
      expect(await prisma.party.findUnique({ where: { id: 'old-party-3' } })).toBeNull();
    });

    it('should return 0 when there are no parties to clean up', async () => {
      // No parties in the database
      const deletedCount = await partyService.cleanupCompletedParties();
      expect(deletedCount).toBe(0);
    });

    it('should handle parties with null completedAt (should not delete)', async () => {
      // Create a COMPLETE party without completedAt (edge case)
      await prisma.party.create({
        data: {
          id: 'null-completed-party',
          code: 'NUL1',
          status: PartyStatus.COMPLETE,
          hostId: 'test-host-id',
          settings: '{}',
          completedAt: null,
        },
      });

      // Run cleanup
      const deletedCount = await partyService.cleanupCompletedParties();

      // Verify party was NOT deleted (null completedAt doesn't match lt condition)
      expect(deletedCount).toBe(0);
      const partyAfter = await prisma.party.findUnique({
        where: { id: 'null-completed-party' },
      });
      expect(partyAfter).not.toBeNull();
    });

    it('should only delete old completed parties and leave recent ones', async () => {
      const oldCompletedAt = new Date();
      oldCompletedAt.setHours(oldCompletedAt.getHours() - 48);

      const recentCompletedAt = new Date();
      recentCompletedAt.setHours(recentCompletedAt.getHours() - 12);

      // Create old completed party
      await prisma.party.create({
        data: {
          id: 'old-completed',
          code: 'OLD2',
          status: PartyStatus.COMPLETE,
          hostId: 'host-old',
          settings: '{}',
          completedAt: oldCompletedAt,
        },
      });

      // Create recent completed party
      await prisma.party.create({
        data: {
          id: 'recent-completed',
          code: 'REC2',
          status: PartyStatus.COMPLETE,
          hostId: 'host-recent',
          settings: '{}',
          completedAt: recentCompletedAt,
        },
      });

      // Run cleanup
      const deletedCount = await partyService.cleanupCompletedParties();

      // Verify only old party was deleted
      expect(deletedCount).toBe(1);
      expect(await prisma.party.findUnique({ where: { id: 'old-completed' } })).toBeNull();
      expect(await prisma.party.findUnique({ where: { id: 'recent-completed' } })).not.toBeNull();
    });
  });
});
