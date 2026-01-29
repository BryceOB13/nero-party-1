import { prisma } from '../../lib/prisma';
import { partyService } from '../party.service';
import { identityService } from '../identity.service';
import { PartyStatus, PlayerStatus } from '../../types';

/**
 * Unit tests for lobby event handlers in PartyService.
 * These tests validate the core business logic for lobby operations.
 * 
 * **Validates: Requirements 1.7, 3.6**
 * - 1.7: WHEN a Player joins or leaves a Party, THE Backend SHALL broadcast the updated player list to all connected Players
 * - 3.6: WHEN settings are updated, THE Backend SHALL broadcast the new settings to all Players in the Party
 */
describe('Lobby Event Handler Logic', () => {
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

  describe('lobby:join - joinParty()', () => {
    it('should join a player to a party with valid code', async () => {
      const { party } = await partyService.createParty('Host');
      
      const { party: joinedParty, player } = await partyService.joinParty(party.code, 'TestPlayer');
      
      expect(player.name).toBe('TestPlayer');
      expect(player.partyId).toBe(party.id);
      expect(player.isHost).toBe(false);
      expect(joinedParty.id).toBe(party.id);
    });

    it('should throw PARTY_NOT_FOUND for invalid party code', async () => {
      await expect(partyService.joinParty('XXXX', 'TestPlayer'))
        .rejects.toMatchObject({ code: 'PARTY_NOT_FOUND' });
    });

    it('should throw PARTY_STARTED when party is not in LOBBY state', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      
      // Start the party
      await partyService.startParty(party.id, host.id);
      
      await expect(partyService.joinParty(party.code, 'LatePlayer'))
        .rejects.toMatchObject({ code: 'PARTY_STARTED' });
    });

    it('should add player to party player list', async () => {
      const { party } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      
      const players = await partyService.getPlayers(party.id);
      
      expect(players).toHaveLength(3);
      expect(players.map(p => p.name)).toContain('Host');
      expect(players.map(p => p.name)).toContain('Player2');
      expect(players.map(p => p.name)).toContain('Player3');
    });
  });

  describe('lobby:settings_updated - updateSettings()', () => {
    it('should update settings when host makes changes', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      const updatedParty = await partyService.updateSettings(party.id, host.id, {
        songsPerPlayer: 3,
        playDuration: 60
      });
      
      expect(updatedParty.settings.songsPerPlayer).toBe(3);
      expect(updatedParty.settings.playDuration).toBe(60);
    });

    it('should throw NOT_HOST when non-host tries to update settings', async () => {
      const { party } = await partyService.createParty('Host');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      
      await expect(partyService.updateSettings(party.id, player2.id, { songsPerPlayer: 3 }))
        .rejects.toMatchObject({ code: 'NOT_HOST' });
    });

    it('should throw INVALID_SETTINGS for invalid songsPerPlayer', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      await expect(partyService.updateSettings(party.id, host.id, { songsPerPlayer: 5 as any }))
        .rejects.toMatchObject({ code: 'INVALID_SETTINGS' });
    });

    it('should throw INVALID_SETTINGS for invalid playDuration', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      await expect(partyService.updateSettings(party.id, host.id, { playDuration: 120 as any }))
        .rejects.toMatchObject({ code: 'INVALID_SETTINGS' });
    });

    it('should throw INVALID_SETTINGS for invalid bonusCategoryCount', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      await expect(partyService.updateSettings(party.id, host.id, { bonusCategoryCount: 5 as any }))
        .rejects.toMatchObject({ code: 'INVALID_SETTINGS' });
    });

    it('should throw INVALID_STATE when party is not in LOBBY state', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);
      
      await expect(partyService.updateSettings(party.id, host.id, { songsPerPlayer: 3 }))
        .rejects.toMatchObject({ code: 'INVALID_STATE' });
    });
  });

  describe('lobby:start - startParty()', () => {
    it('should transition party to SUBMITTING state', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      
      const updatedParty = await partyService.startParty(party.id, host.id);
      
      expect(updatedParty.status).toBe(PartyStatus.SUBMITTING);
      expect(updatedParty.startedAt).toBeDefined();
    });

    it('should throw NOT_HOST when non-host tries to start', async () => {
      const { party } = await partyService.createParty('Host');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      
      await expect(partyService.startParty(party.id, player2.id))
        .rejects.toMatchObject({ code: 'NOT_HOST' });
    });

    it('should throw INVALID_STATE when party is not in LOBBY state', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);
      
      await expect(partyService.startParty(party.id, host.id))
        .rejects.toMatchObject({ code: 'INVALID_STATE' });
    });
  });

  describe('lobby:start - assignIdentities()', () => {
    it('should assign unique identities to all players when starting', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      
      const players = await partyService.getPlayers(party.id);
      const identities = await identityService.assignIdentities(party.id, players);
      
      expect(identities).toHaveLength(3);
      
      // All aliases should be unique
      const aliases = identities.map(i => i.alias);
      expect(new Set(aliases).size).toBe(3);
      
      // All silhouettes should be unique
      const silhouettes = identities.map(i => i.silhouette);
      expect(new Set(silhouettes).size).toBe(3);
      
      // All colors should be unique
      const colors = identities.map(i => i.color);
      expect(new Set(colors).size).toBe(3);
    });

    it('should assign identity to each player', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      
      const players = await partyService.getPlayers(party.id);
      await identityService.assignIdentities(party.id, players);
      
      for (const player of players) {
        const identity = await identityService.getIdentity(player.id);
        expect(identity).toBeDefined();
        expect(identity?.alias).toBeDefined();
        expect(identity?.silhouette).toBeDefined();
        expect(identity?.color).toBeDefined();
      }
    });
  });

  describe('lobby:kick - kickPlayer()', () => {
    it('should kick a player and set status to KICKED', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      
      await partyService.kickPlayer(party.id, host.id, player2.id);
      
      const kickedPlayer = await partyService.getPlayer(player2.id);
      expect(kickedPlayer?.status).toBe(PlayerStatus.KICKED);
    });

    it('should throw NOT_HOST when non-host tries to kick', async () => {
      const { party } = await partyService.createParty('Host');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: player3 } = await partyService.joinParty(party.code, 'Player3');
      
      await expect(partyService.kickPlayer(party.id, player2.id, player3.id))
        .rejects.toMatchObject({ code: 'NOT_HOST' });
    });

    it('should throw CANNOT_KICK_SELF when host tries to kick themselves', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      await expect(partyService.kickPlayer(party.id, host.id, host.id))
        .rejects.toMatchObject({ code: 'CANNOT_KICK_SELF' });
    });

    it('should throw TARGET_NOT_FOUND for non-existent player', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      await expect(partyService.kickPlayer(party.id, host.id, 'non-existent-id'))
        .rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
    });

    it('should throw INVALID_STATE when party is not in LOBBY state', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.startParty(party.id, host.id);
      
      await expect(partyService.kickPlayer(party.id, host.id, player2.id))
        .rejects.toMatchObject({ code: 'INVALID_STATE' });
    });

    it('should clear socketId when player is kicked', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      
      // Set a socketId
      await prisma.player.update({
        where: { id: player2.id },
        data: { socketId: 'test-socket-id' }
      });
      
      await partyService.kickPlayer(party.id, host.id, player2.id);
      
      const kickedPlayer = await partyService.getPlayer(player2.id);
      expect(kickedPlayer?.socketId).toBeNull();
    });
  });
});
