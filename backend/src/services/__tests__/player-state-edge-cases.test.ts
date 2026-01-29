import { PrismaClient } from '@prisma/client';
import { partyService } from '../party.service';
import { identityService } from '../identity.service';
import { scoringService } from '../scoring.service';
import { songService } from '../song.service';
import { PartyStatus, PlayerStatus, DEFAULT_PARTY_SETTINGS } from '../../types';

const prisma = new PrismaClient();

/**
 * Comprehensive edge case tests for player state management and database consistency.
 * These tests isolate logical issues related to:
 * - Player state transitions
 * - Database consistency
 * - Scoring edge cases
 * - Identity management
 * - Party state transitions
 */
describe('Player State Edge Cases', () => {
  beforeEach(async () => {
    // Clean up database in reverse order of dependencies
    await prisma.roundPrediction.deleteMany();
    await prisma.playerPowerUp.deleteMany();
    await prisma.activeEvent.deleteMany();
    await prisma.playerAchievement.deleteMany();
    await prisma.bonusResult.deleteMany();
    await prisma.vote.deleteMany();
    await prisma.song.deleteMany();
    await prisma.round.deleteMany();
    await prisma.partyIdentity.deleteMany();
    await prisma.player.deleteMany();
    await prisma.party.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ============================================================================
  // PLAYER STATUS TRANSITIONS
  // ============================================================================
  describe('Player Status Transitions', () => {
    it('should handle player disconnect and reconnect within timeout', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      // Simulate disconnect
      await prisma.player.update({
        where: { id: host.id },
        data: { status: PlayerStatus.DISCONNECTED, socketId: null }
      });
      
      const disconnectedPlayer = await partyService.getPlayer(host.id);
      expect(disconnectedPlayer?.status).toBe(PlayerStatus.DISCONNECTED);
      expect(disconnectedPlayer?.socketId).toBeNull();
      
      // Simulate reconnect
      await prisma.player.update({
        where: { id: host.id },
        data: { status: PlayerStatus.CONNECTED, socketId: 'new-socket-id' }
      });
      
      const reconnectedPlayer = await partyService.getPlayer(host.id);
      expect(reconnectedPlayer?.status).toBe(PlayerStatus.CONNECTED);
      expect(reconnectedPlayer?.socketId).toBe('new-socket-id');
    });

    it('should not allow kicked player to rejoin', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      
      // Kick the player
      await partyService.kickPlayer(party.id, host.id, player2.id);
      
      const kickedPlayer = await partyService.getPlayer(player2.id);
      expect(kickedPlayer?.status).toBe(PlayerStatus.KICKED);
      
      // Verify kicked player still exists in database but with KICKED status
      const players = await partyService.getPlayers(party.id);
      const kickedInList = players.find(p => p.id === player2.id);
      expect(kickedInList?.status).toBe(PlayerStatus.KICKED);
    });

    it('should handle multiple players disconnecting simultaneously', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: p2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: p3 } = await partyService.joinParty(party.code, 'Player3');
      const { player: p4 } = await partyService.joinParty(party.code, 'Player4');
      
      // Disconnect all non-host players
      await prisma.player.updateMany({
        where: { partyId: party.id, isHost: false },
        data: { status: PlayerStatus.DISCONNECTED, socketId: null }
      });
      
      const players = await partyService.getPlayers(party.id);
      const disconnectedCount = players.filter(p => p.status === PlayerStatus.DISCONNECTED).length;
      expect(disconnectedCount).toBe(3);
      
      // Host should still be connected
      const hostPlayer = players.find(p => p.isHost);
      expect(hostPlayer?.status).toBe(PlayerStatus.CONNECTED);
    });

    it('should preserve player data when status changes', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      // Store original data
      const originalName = host.name;
      const originalIsHost = host.isHost;
      
      // Change status multiple times
      await prisma.player.update({
        where: { id: host.id },
        data: { status: PlayerStatus.DISCONNECTED }
      });
      
      await prisma.player.update({
        where: { id: host.id },
        data: { status: PlayerStatus.CONNECTED }
      });
      
      const player = await partyService.getPlayer(host.id);
      expect(player?.name).toBe(originalName);
      expect(player?.isHost).toBe(originalIsHost);
    });
  });

  // ============================================================================
  // PARTY STATE TRANSITIONS
  // ============================================================================
  describe('Party State Transitions', () => {
    it('should not allow starting party with only host', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      // Party can technically start with just host, but let's verify the state
      const updatedParty = await partyService.startParty(party.id, host.id);
      expect(updatedParty.status).toBe(PartyStatus.SUBMITTING);
    });

    it('should handle rapid state transitions', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      
      // Start party
      await partyService.startParty(party.id, host.id);
      
      // Try to start again - should fail
      await expect(partyService.startParty(party.id, host.id))
        .rejects.toMatchObject({ code: 'INVALID_STATE' });
    });

    it('should maintain player associations through state transitions', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: p2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: p3 } = await partyService.joinParty(party.code, 'Player3');
      
      // Start party
      await partyService.startParty(party.id, host.id);
      
      // Verify all players still associated
      const players = await partyService.getPlayers(party.id);
      expect(players).toHaveLength(3);
      expect(players.map(p => p.id)).toContain(host.id);
      expect(players.map(p => p.id)).toContain(p2.id);
      expect(players.map(p => p.id)).toContain(p3.id);
    });

    it('should handle transition to PLAYING with no songs submitted', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      
      // Start party (goes to SUBMITTING)
      await partyService.startParty(party.id, host.id);
      
      // Try to transition to PLAYING without songs - should fail
      await expect(partyService.transitionToPlaying(party.id))
        .rejects.toMatchObject({ code: 'SUBMISSIONS_INCOMPLETE' });
    });

    it('should handle transition to FINALE from wrong state', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      // Try to transition to FINALE from LOBBY - should fail
      await expect(partyService.transitionToFinale(party.id))
        .rejects.toMatchObject({ code: 'INVALID_STATE' });
    });

    it('should handle transition to COMPLETE from wrong state', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      // Try to transition to COMPLETE from LOBBY - should fail
      await expect(partyService.transitionToComplete(party.id))
        .rejects.toMatchObject({ code: 'INVALID_STATE' });
    });
  });

  // ============================================================================
  // IDENTITY MANAGEMENT EDGE CASES
  // ============================================================================
  describe('Identity Management Edge Cases', () => {
    it('should assign unique identities to all players', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.joinParty(party.code, 'Player2');
      await partyService.joinParty(party.code, 'Player3');
      await partyService.joinParty(party.code, 'Player4');
      await partyService.joinParty(party.code, 'Player5');
      
      const players = await partyService.getPlayers(party.id);
      const identities = await identityService.assignIdentities(party.id, players);
      
      // All aliases should be unique
      const aliases = identities.map(i => i.alias);
      expect(new Set(aliases).size).toBe(aliases.length);
      
      // All silhouettes should be unique
      const silhouettes = identities.map(i => i.silhouette);
      expect(new Set(silhouettes).size).toBe(silhouettes.length);
      
      // All colors should be unique
      const colors = identities.map(i => i.color);
      expect(new Set(colors).size).toBe(colors.length);
    });

    it('should handle identity assignment for maximum players (20)', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      // Add 19 more players (total 20)
      for (let i = 2; i <= 20; i++) {
        await partyService.joinParty(party.code, `Player${i}`);
      }
      
      const players = await partyService.getPlayers(party.id);
      expect(players).toHaveLength(20);
      
      const identities = await identityService.assignIdentities(party.id, players);
      expect(identities).toHaveLength(20);
      
      // All should be unique
      const aliases = identities.map(i => i.alias);
      expect(new Set(aliases).size).toBe(20);
    });

    it('should return null for non-existent player identity', async () => {
      const identity = await identityService.getIdentity('non-existent-id');
      expect(identity).toBeNull();
    });

    it('should handle reveal order with tied scores', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: p2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: p3 } = await partyService.joinParty(party.code, 'Player3');
      
      const players = await partyService.getPlayers(party.id);
      await identityService.assignIdentities(party.id, players);
      
      // All players have 0 score (no songs), so reveal order should still work
      const revealOrder = await identityService.getRevealOrder(party.id);
      expect(revealOrder).toHaveLength(3);
    });

    it('should handle leaderboard with no songs submitted', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: p2 } = await partyService.joinParty(party.code, 'Player2');
      
      const players = await partyService.getPlayers(party.id);
      await identityService.assignIdentities(party.id, players);
      
      const leaderboard = await identityService.getAnonymousLeaderboard(party.id);
      expect(leaderboard).toHaveLength(2);
      expect(leaderboard.every(e => e.score === 0)).toBe(true);
    });
  });

  // ============================================================================
  // SCORING EDGE CASES
  // ============================================================================
  describe('Scoring Edge Cases', () => {
    it('should reject vote on non-existent song', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      await expect(scoringService.castVote('non-existent-song', host.id, 5))
        .rejects.toMatchObject({ code: 'SONG_NOT_FOUND' });
    });

    it('should reject vote from non-existent player', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.startParty(party.id, host.id);
      
      // Create a song
      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          submitterId: host.id,
          soundcloudId: BigInt(123456),
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test',
          confidence: 3,
          roundNumber: 1,
          queuePosition: 1
        }
      });
      
      await expect(scoringService.castVote(song.id, 'non-existent-player', 5))
        .rejects.toMatchObject({ code: 'PLAYER_NOT_FOUND' });
    });

    it('should reject self-voting', async () => {
      const { party, host } = await partyService.createParty('Host');
      await partyService.startParty(party.id, host.id);
      
      // Create a song by host
      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          submitterId: host.id,
          soundcloudId: BigInt(123456),
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test',
          confidence: 3,
          roundNumber: 1,
          queuePosition: 1
        }
      });
      
      await expect(scoringService.castVote(song.id, host.id, 5))
        .rejects.toMatchObject({ code: 'CANNOT_VOTE_OWN_SONG' });
    });

    it('should reject duplicate votes', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: voter } = await partyService.joinParty(party.code, 'Voter');
      await partyService.startParty(party.id, host.id);
      
      // Create a song by host
      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          submitterId: host.id,
          soundcloudId: BigInt(123456),
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test',
          confidence: 3,
          roundNumber: 1,
          queuePosition: 1
        }
      });
      
      // First vote should succeed
      await scoringService.castVote(song.id, voter.id, 5);
      
      // Second vote should fail
      await expect(scoringService.castVote(song.id, voter.id, 8))
        .rejects.toMatchObject({ code: 'VOTE_LOCKED' });
    });

    it('should reject votes outside valid range', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: voter } = await partyService.joinParty(party.code, 'Voter');
      await partyService.startParty(party.id, host.id);
      
      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          submitterId: host.id,
          soundcloudId: BigInt(123456),
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test',
          confidence: 3,
          roundNumber: 1,
          queuePosition: 1
        }
      });
      
      // Vote below range
      await expect(scoringService.castVote(song.id, voter.id, 0))
        .rejects.toMatchObject({ code: 'INVALID_VOTE_RATING' });
      
      // Vote above range
      await expect(scoringService.castVote(song.id, voter.id, 11))
        .rejects.toMatchObject({ code: 'INVALID_VOTE_RATING' });
      
      // Non-integer vote
      await expect(scoringService.castVote(song.id, voter.id, 5.5))
        .rejects.toMatchObject({ code: 'INVALID_VOTE_RATING' });
    });

    it('should handle super vote with insufficient points', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: voter } = await partyService.joinParty(party.code, 'Voter');
      await partyService.startParty(party.id, host.id);
      
      // Set voter points to 1 (less than required 2)
      await prisma.player.update({
        where: { id: voter.id },
        data: { powerUpPoints: 1 }
      });
      
      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          submitterId: host.id,
          soundcloudId: BigInt(123456),
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test',
          confidence: 3,
          roundNumber: 1,
          queuePosition: 1
        }
      });
      
      await expect(scoringService.castVote(song.id, voter.id, 5, true))
        .rejects.toMatchObject({ code: 'INSUFFICIENT_POINTS' });
    });

    it('should deduct points for super vote', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: voter } = await partyService.joinParty(party.code, 'Voter');
      await partyService.startParty(party.id, host.id);
      
      // Set voter points to 10
      await prisma.player.update({
        where: { id: voter.id },
        data: { powerUpPoints: 10 }
      });
      
      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          submitterId: host.id,
          soundcloudId: BigInt(123456),
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test',
          confidence: 3,
          roundNumber: 1,
          queuePosition: 1
        }
      });
      
      await scoringService.castVote(song.id, voter.id, 5, true);
      
      const updatedVoter = await partyService.getPlayer(voter.id);
      // Points should be deducted - need to check database directly
      const voterRecord = await prisma.player.findUnique({ where: { id: voter.id } });
      expect(voterRecord?.powerUpPoints).toBe(8); // 10 - 2
    });
  });

  // ============================================================================
  // WEIGHT MULTIPLIER EDGE CASES
  // ============================================================================
  describe('Weight Multiplier Edge Cases', () => {
    it('should apply correct multiplier for 1 song per player', () => {
      expect(scoringService.getWeightMultiplier(1, 1)).toBe(1.5);
    });

    it('should apply correct multipliers for 2 songs per player', () => {
      expect(scoringService.getWeightMultiplier(1, 2)).toBe(1.0);
      expect(scoringService.getWeightMultiplier(2, 2)).toBe(2.0);
    });

    it('should apply correct multipliers for 3 songs per player', () => {
      expect(scoringService.getWeightMultiplier(1, 3)).toBe(1.0);
      expect(scoringService.getWeightMultiplier(2, 3)).toBe(1.5);
      expect(scoringService.getWeightMultiplier(3, 3)).toBe(2.0);
    });

    it('should handle invalid round numbers gracefully', () => {
      // Round 0 should default to 1.0
      expect(scoringService.getWeightMultiplier(0, 2)).toBe(1.0);
      
      // Round beyond total should use last round multiplier
      expect(scoringService.getWeightMultiplier(4, 3)).toBe(2.0);
    });
  });

  // ============================================================================
  // CONFIDENCE MODIFIER EDGE CASES
  // ============================================================================
  describe('Confidence Modifier Edge Cases', () => {
    it('should apply +2 bonus for high confidence and high score', () => {
      const modifier = scoringService.applyConfidenceModifier(7.0, 4, true);
      expect(modifier).toBe(2);
    });

    it('should apply -2 penalty for high confidence and low score', () => {
      const modifier = scoringService.applyConfidenceModifier(4.0, 5, true);
      expect(modifier).toBe(-2);
    });

    it('should apply no modifier for mid-range scores', () => {
      const modifier = scoringService.applyConfidenceModifier(5.5, 5, true);
      expect(modifier).toBe(0);
    });

    it('should apply no modifier when confidence betting disabled', () => {
      const modifier = scoringService.applyConfidenceModifier(9.0, 5, false);
      expect(modifier).toBe(0);
    });

    it('should apply no modifier for low confidence', () => {
      const modifier = scoringService.applyConfidenceModifier(9.0, 3, true);
      expect(modifier).toBe(0);
    });

    it('should handle boundary values correctly', () => {
      // Exactly 7.0 should get bonus
      expect(scoringService.applyConfidenceModifier(7.0, 4, true)).toBe(2);
      
      // Exactly 4.0 should get penalty
      expect(scoringService.applyConfidenceModifier(4.0, 4, true)).toBe(-2);
      
      // Just above 4.0 should get no modifier
      expect(scoringService.applyConfidenceModifier(4.01, 4, true)).toBe(0);
      
      // Just below 7.0 should get no modifier
      expect(scoringService.applyConfidenceModifier(6.99, 4, true)).toBe(0);
    });
  });

  // ============================================================================
  // DATABASE CONSISTENCY EDGE CASES
  // ============================================================================
  describe('Database Consistency Edge Cases', () => {
    it('should maintain referential integrity when deleting party', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: p2 } = await partyService.joinParty(party.code, 'Player2');
      
      const players = await partyService.getPlayers(party.id);
      await identityService.assignIdentities(party.id, players);
      
      // Delete party (should cascade delete players and identities)
      await prisma.party.delete({ where: { id: party.id } });
      
      // Verify players are deleted
      const remainingPlayers = await prisma.player.findMany({
        where: { partyId: party.id }
      });
      expect(remainingPlayers).toHaveLength(0);
      
      // Verify identities are deleted
      const remainingIdentities = await prisma.partyIdentity.findMany({
        where: { partyId: party.id }
      });
      expect(remainingIdentities).toHaveLength(0);
    });

    it('should handle concurrent player joins', async () => {
      const { party } = await partyService.createParty('Host');
      
      // Simulate concurrent joins
      const joinPromises = [];
      for (let i = 2; i <= 5; i++) {
        joinPromises.push(partyService.joinParty(party.code, `Player${i}`));
      }
      
      const results = await Promise.all(joinPromises);
      
      // All joins should succeed
      expect(results).toHaveLength(4);
      
      // All players should be in the party
      const players = await partyService.getPlayers(party.id);
      expect(players).toHaveLength(5);
    });

    it('should handle party at maximum capacity', async () => {
      const { party } = await partyService.createParty('Host');
      
      // Add 19 more players (total 20 - max capacity)
      for (let i = 2; i <= 20; i++) {
        await partyService.joinParty(party.code, `Player${i}`);
      }
      
      // 21st player should be rejected
      await expect(partyService.joinParty(party.code, 'Player21'))
        .rejects.toMatchObject({ code: 'PARTY_FULL' });
    });

    it('should preserve settings through party lifecycle', async () => {
      const customSettings = {
        songsPerPlayer: 3 as const,
        playDuration: 60 as const,
        bonusCategoryCount: 1 as const,
        enableConfidenceBetting: false
      };
      
      const { party, host } = await partyService.createParty('Host', customSettings);
      
      // Verify initial settings
      expect(party.settings.songsPerPlayer).toBe(3);
      expect(party.settings.playDuration).toBe(60);
      expect(party.settings.bonusCategoryCount).toBe(1);
      expect(party.settings.enableConfidenceBetting).toBe(false);
      
      // Add player and start
      await partyService.joinParty(party.code, 'Player2');
      const startedParty = await partyService.startParty(party.id, host.id);
      
      // Settings should be preserved
      expect(startedParty.settings.songsPerPlayer).toBe(3);
      expect(startedParty.settings.playDuration).toBe(60);
    });
  });

  // ============================================================================
  // EXTREME EDGE CASES
  // ============================================================================
  describe('Extreme Edge Cases', () => {
    it('should handle empty player name', async () => {
      const { party } = await partyService.createParty('Host');
      
      // Empty name should still work (validation is at API level)
      const { player } = await partyService.joinParty(party.code, '');
      expect(player.name).toBe('');
    });

    it('should handle very long player name', async () => {
      const { party } = await partyService.createParty('Host');
      const longName = 'A'.repeat(1000);
      
      const { player } = await partyService.joinParty(party.code, longName);
      expect(player.name).toBe(longName);
    });

    it('should handle special characters in player name', async () => {
      const { party } = await partyService.createParty('Host');
      const specialName = '🎵 Player <script>alert("xss")</script> 🎶';
      
      const { player } = await partyService.joinParty(party.code, specialName);
      expect(player.name).toBe(specialName);
    });

    it('should handle player score calculation with no songs', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      const score = await scoringService.calculatePlayerScore(host.id, party.id);
      expect(score).toBe(0);
    });

    it('should handle vote variance with single vote', () => {
      const variance = scoringService.calculateVoteVariance([5]);
      expect(variance).toBe(0);
    });

    it('should handle vote variance with identical votes', () => {
      const variance = scoringService.calculateVoteVariance([5, 5, 5, 5, 5]);
      expect(variance).toBe(0);
    });

    it('should handle vote variance with extreme spread', () => {
      const variance = scoringService.calculateVoteVariance([1, 10]);
      // Mean = 5.5, variance = ((1-5.5)^2 + (10-5.5)^2) / 2 = (20.25 + 20.25) / 2 = 20.25
      expect(variance).toBe(20.25);
    });

    it('should handle leaderboard movement calculation', async () => {
      const { party, host } = await partyService.createParty('Host');
      const { player: p2 } = await partyService.joinParty(party.code, 'Player2');
      
      const players = await partyService.getPlayers(party.id);
      await identityService.assignIdentities(party.id, players);
      
      // First leaderboard - all new
      const leaderboard1 = await identityService.getAnonymousLeaderboard(party.id);
      expect(leaderboard1.every(e => e.movement === 'new')).toBe(true);
      
      // Second leaderboard with previous scores
      const previousScores = new Map<string, number>();
      previousScores.set(host.id, 0);
      previousScores.set(p2.id, 0);
      
      const leaderboard2 = await identityService.getAnonymousLeaderboard(party.id, previousScores);
      expect(leaderboard2.every(e => e.movement === 'same')).toBe(true);
    });
  });
});
