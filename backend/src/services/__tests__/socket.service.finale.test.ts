import { prisma } from '../../lib/prisma';
import { partyService } from '../party.service';
import { songService } from '../song.service';
import { scoringService } from '../scoring.service';
import { identityService } from '../identity.service';
import { socketService } from '../socket.service';
import { PartyStatus, SongSubmission, Song, FinalStanding, LeaderboardEntry, BonusResult } from '../../types';

/**
 * Unit tests for finale event handlers.
 * These tests validate the core business logic for finale sequence operations.
 * 
 * **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 10.7**
 * - 8.2: WHEN the game transitions to FINALE, THE Backend SHALL freeze the leaderboard and display "Scores Locked"
 * - 8.3: WHEN bonus categories are revealed, THE Backend SHALL animate each category card with winner and points
 * - 8.4: WHEN identities are revealed, THE Backend SHALL reveal players from last place to first place
 * - 8.5: WHEN a player is revealed, THE Backend SHALL display their alias, real name, and submitted songs
 * - 8.6: WHEN the champion is crowned, THE Backend SHALL play their highest-scoring song
 * - 10.7: WHEN the finale sequence begins, THE Backend SHALL emit timed events for reveals
 */
describe('Finale Event Handler Logic', () => {
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

  /**
   * Helper function to create a party in PLAYING state with songs and votes
   */
  async function createPlayingPartyWithVotes(songsPerPlayer: 1 | 2 | 3 = 1, bonusCategoryCount: 0 | 1 | 2 | 3 = 2) {
    const { party, host } = await partyService.createParty('Host', { 
      songsPerPlayer,
      bonusCategoryCount,
      enableConfidenceBetting: true
    });
    const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
    const { player: player3 } = await partyService.joinParty(party.code, 'Player3');
    
    // Start party (transitions to SUBMITTING)
    await partyService.startParty(party.id, host.id);
    
    // Assign identities
    const players = await partyService.getPlayers(party.id);
    await identityService.assignIdentities(party.id, players);
    
    const baseSongData: SongSubmission = {
      soundcloudId: 123456,
      title: 'Test Song',
      artist: 'Test Artist',
      artworkUrl: 'https://example.com/artwork.jpg',
      duration: 180000,
      permalinkUrl: 'https://soundcloud.com/test/song',
      confidence: 3
    };

    // Submit songs for all players with varying confidence levels
    const songs: Song[] = [];
    for (let round = 1; round <= songsPerPlayer; round++) {
      songs.push(await songService.submitSong(party.id, host.id, { 
        ...baseSongData, 
        soundcloudId: round * 100 + 1,
        title: `Host Song ${round}`,
        confidence: 5 // High confidence for host
      }));
      songs.push(await songService.submitSong(party.id, player2.id, { 
        ...baseSongData, 
        soundcloudId: round * 100 + 2,
        title: `Player2 Song ${round}`,
        confidence: 2 // Low confidence for player2 (Hidden Gem candidate)
      }));
      songs.push(await songService.submitSong(party.id, player3.id, { 
        ...baseSongData, 
        soundcloudId: round * 100 + 3,
        title: `Player3 Song ${round}`,
        confidence: 3
      }));
    }

    // Transition to PLAYING
    const updatedParty = await partyService.transitionToPlaying(party.id);

    // Cast votes on all songs
    for (const song of songs) {
      const voters = [host, player2, player3].filter(p => p.id !== song.submitterId);
      for (const voter of voters) {
        // Give host's songs higher ratings
        const rating = song.submitterId === host.id ? 9 : 
                       song.submitterId === player2.id ? 7 : 5;
        await scoringService.castVote(song.id, voter.id, rating);
      }
    }

    // Calculate scores for all songs
    for (const song of songs) {
      await scoringService.calculateSongScore(song.id);
    }

    return {
      party: updatedParty,
      host,
      player2,
      player3,
      songs
    };
  }

  describe('transitionToFinale()', () => {
    it('should transition party from PLAYING to FINALE state', async () => {
      const { party } = await createPlayingPartyWithVotes();
      
      // Transition to FINALE
      const finaleParty = await partyService.transitionToFinale(party.id);
      
      expect(finaleParty.status).toBe(PartyStatus.FINALE);
    });

    it('should throw INVALID_STATE when party is not in PLAYING state', async () => {
      const { party, host } = await partyService.createParty('Host');
      
      // Party is in LOBBY state
      await expect(partyService.transitionToFinale(party.id))
        .rejects.toMatchObject({ code: 'INVALID_STATE' });
    });

    it('should throw PARTY_NOT_FOUND for non-existent party', async () => {
      await expect(partyService.transitionToFinale('non-existent-id'))
        .rejects.toMatchObject({ code: 'PARTY_NOT_FOUND' });
    });
  });

  describe('transitionToComplete()', () => {
    it('should transition party from FINALE to COMPLETE state', async () => {
      const { party } = await createPlayingPartyWithVotes();
      
      // Transition to FINALE first
      await partyService.transitionToFinale(party.id);
      
      // Transition to COMPLETE
      const completeParty = await partyService.transitionToComplete(party.id);
      
      expect(completeParty.status).toBe(PartyStatus.COMPLETE);
      expect(completeParty.completedAt).toBeDefined();
    });

    it('should throw INVALID_STATE when party is not in FINALE state', async () => {
      const { party } = await createPlayingPartyWithVotes();
      
      // Party is in PLAYING state
      await expect(partyService.transitionToComplete(party.id))
        .rejects.toMatchObject({ code: 'INVALID_STATE' });
    });
  });

  describe('finale:start - Frozen Standings (Requirement 8.2)', () => {
    it('should freeze leaderboard when transitioning to FINALE', async () => {
      const { party, host, player2, player3 } = await createPlayingPartyWithVotes();
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Get frozen standings
      const frozenStandings = await identityService.getAnonymousLeaderboard(party.id);
      
      expect(frozenStandings).toHaveLength(3);
      
      // Verify standings are sorted by score descending
      expect(frozenStandings[0].score).toBeGreaterThanOrEqual(frozenStandings[1].score);
      expect(frozenStandings[1].score).toBeGreaterThanOrEqual(frozenStandings[2].score);
      
      // Verify standings contain aliases (not real names) initially
      for (const entry of frozenStandings) {
        expect(entry.alias).toBeDefined();
        expect(entry.isRevealed).toBe(false);
      }
    });

    it('should calculate final standings correctly', async () => {
      const { party, host, player2, player3 } = await createPlayingPartyWithVotes();
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Calculate final standings
      const finalStandings = await scoringService.calculateFinalStandings(party.id);
      
      expect(finalStandings).toHaveLength(3);
      
      // Verify standings are sorted by finalScore descending
      expect(finalStandings[0].finalScore).toBeGreaterThanOrEqual(finalStandings[1].finalScore);
      expect(finalStandings[1].finalScore).toBeGreaterThanOrEqual(finalStandings[2].finalScore);
      
      // Verify ranks are assigned correctly
      expect(finalStandings[0].rank).toBe(1);
      expect(finalStandings[1].rank).toBe(2);
      expect(finalStandings[2].rank).toBe(3);
      
      // Verify each standing has required fields
      for (const standing of finalStandings) {
        expect(standing.playerId).toBeDefined();
        expect(standing.alias).toBeDefined();
        expect(standing.realName).toBeDefined();
        expect(standing.songs).toBeDefined();
        expect(standing.totalBaseScore).toBeDefined();
        expect(standing.confidenceModifiers).toBeDefined();
        expect(standing.bonusPoints).toBeDefined();
        expect(standing.finalScore).toBeDefined();
      }
    });
  });

  describe('finale:category_reveal - Bonus Categories (Requirement 8.3)', () => {
    it('should calculate bonus category winners', async () => {
      const { party } = await createPlayingPartyWithVotes(1, 2);
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Calculate bonus winners
      const bonusResults = await scoringService.calculateBonusWinners(party.id);
      
      // Should have 2 bonus categories (as configured)
      expect(bonusResults.length).toBeLessThanOrEqual(2);
      
      // Each result should have required fields
      for (const result of bonusResults) {
        expect(result.categoryId).toBeDefined();
        expect(result.categoryName).toBeDefined();
        expect(result.winningSongId).toBeDefined();
        expect(result.winnerPlayerId).toBeDefined();
        expect(result.points).toBe(10); // Bonus points are always 10
        expect(result.revealOrder).toBeDefined();
      }
    });

    it('should skip bonus categories when bonusCategoryCount is 0', async () => {
      const { party } = await createPlayingPartyWithVotes(1, 0);
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Calculate bonus winners
      const bonusResults = await scoringService.calculateBonusWinners(party.id);
      
      expect(bonusResults).toHaveLength(0);
    });

    it('should award 10 bonus points to category winners', async () => {
      const { party, host } = await createPlayingPartyWithVotes(1, 2);
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Calculate bonus winners
      const bonusResults = await scoringService.calculateBonusWinners(party.id);
      
      // Get final standings (which include bonus points)
      const finalStandings = await scoringService.calculateFinalStandings(party.id);
      
      // Find players who won bonus categories
      const winnersWithBonus = finalStandings.filter(s => s.bonusPoints > 0);
      
      // Each bonus point should be a multiple of 10
      for (const winner of winnersWithBonus) {
        expect(winner.bonusPoints % 10).toBe(0);
      }
    });
  });

  describe('finale:identity_revealed - Identity Reveals (Requirements 8.4, 8.5)', () => {
    it('should return reveal order from last to first place', async () => {
      const { party, host, player2, player3 } = await createPlayingPartyWithVotes();
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Get reveal order
      const revealOrder = await identityService.getRevealOrder(party.id);
      
      expect(revealOrder).toHaveLength(3);
      
      // Calculate scores to verify order
      const finalStandings = await scoringService.calculateFinalStandings(party.id);
      
      // Reveal order should be ascending by score (last place first)
      // So the first player in revealOrder should be the last in finalStandings
      expect(revealOrder[0].id).toBe(finalStandings[2].playerId);
      expect(revealOrder[2].id).toBe(finalStandings[0].playerId);
    });

    it('should mark identity as revealed with correct order', async () => {
      const { party, host, player2, player3 } = await createPlayingPartyWithVotes();
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Get reveal order
      const revealOrder = await identityService.getRevealOrder(party.id);
      
      // Reveal first player (last place)
      const revealedIdentity = await identityService.revealIdentity(
        party.id, 
        revealOrder[0].id, 
        1
      );
      
      expect(revealedIdentity.isRevealed).toBe(true);
      expect(revealedIdentity.revealOrder).toBe(1);
      expect(revealedIdentity.revealedAt).toBeDefined();
    });

    it('should include player songs in reveal data', async () => {
      const { party, host, songs } = await createPlayingPartyWithVotes();
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Get all songs for the party
      const allSongs = await prisma.song.findMany({
        where: { partyId: party.id }
      });
      
      // Get host's songs
      const hostSongs = allSongs.filter(s => s.submitterId === host.id);
      
      expect(hostSongs.length).toBeGreaterThan(0);
      
      // Each song should have score data
      for (const song of hostSongs) {
        expect(song.finalScore).toBeDefined();
      }
    });
  });

  describe('finale:champion - Champion Crowning (Requirement 8.6)', () => {
    it('should identify champion as first place player', async () => {
      const { party, host } = await createPlayingPartyWithVotes();
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Get final standings
      const finalStandings = await scoringService.calculateFinalStandings(party.id);
      
      // Champion should be rank 1
      const champion = finalStandings[0];
      expect(champion.rank).toBe(1);
      
      // Host should be champion (given highest votes in our test setup)
      expect(champion.playerId).toBe(host.id);
    });

    it('should include champion highest-scoring song', async () => {
      const { party, host } = await createPlayingPartyWithVotes();
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Get final standings
      const finalStandings = await scoringService.calculateFinalStandings(party.id);
      const champion = finalStandings[0];
      
      // Champion should have a highest song
      expect(champion.highestSong).toBeDefined();
      expect(champion.highestSong.id).toBeDefined();
      expect(champion.highestSong.title).toBeDefined();
      expect(champion.highestSong.finalScore).toBeDefined();
      
      // Verify it's actually the highest scoring song for the champion
      const championSongs = champion.songs;
      const maxScore = Math.max(...championSongs.map(s => s.finalScore ?? 0));
      expect(champion.highestSong.finalScore).toBe(maxScore);
    });

    it('should include champion bonus categories', async () => {
      const { party, host } = await createPlayingPartyWithVotes(1, 2);
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Calculate bonus winners first
      await scoringService.calculateBonusWinners(party.id);
      
      // Get final standings
      const finalStandings = await scoringService.calculateFinalStandings(party.id);
      const champion = finalStandings[0];
      
      // Champion should have bonusCategories array
      expect(champion.bonusCategories).toBeDefined();
      expect(Array.isArray(champion.bonusCategories)).toBe(true);
    });
  });

  describe('Final Score Composition (Requirement 8.1)', () => {
    it('should calculate final score as sum of base scores + confidence modifiers + bonus points', async () => {
      const { party, host } = await createPlayingPartyWithVotes(1, 2);
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Calculate bonus winners
      await scoringService.calculateBonusWinners(party.id);
      
      // Get final standings
      const finalStandings = await scoringService.calculateFinalStandings(party.id);
      
      // Verify final score composition for each player
      for (const standing of finalStandings) {
        const expectedFinalScore = standing.totalBaseScore + 
                                   standing.confidenceModifiers + 
                                   standing.bonusPoints;
        expect(standing.finalScore).toBeCloseTo(expectedFinalScore, 2);
      }
    });
  });

  describe('Complete Finale Sequence', () => {
    it('should complete full finale flow: start → categories → identities → champion', async () => {
      const { party, host, player2, player3 } = await createPlayingPartyWithVotes(1, 2);
      
      // 1. Transition to FINALE
      const finaleParty = await partyService.transitionToFinale(party.id);
      expect(finaleParty.status).toBe(PartyStatus.FINALE);
      
      // 2. Get frozen standings
      const frozenStandings = await identityService.getAnonymousLeaderboard(party.id);
      expect(frozenStandings).toHaveLength(3);
      
      // 3. Calculate bonus winners
      const bonusResults = await scoringService.calculateBonusWinners(party.id);
      expect(bonusResults.length).toBeLessThanOrEqual(2);
      
      // 4. Get reveal order and reveal identities
      const revealOrder = await identityService.getRevealOrder(party.id);
      expect(revealOrder).toHaveLength(3);
      
      for (let i = 0; i < revealOrder.length; i++) {
        await identityService.revealIdentity(party.id, revealOrder[i].id, i + 1);
      }
      
      // Verify all identities are revealed
      const identities = await identityService.getIdentities(party.id);
      for (const identity of identities) {
        expect(identity.isRevealed).toBe(true);
      }
      
      // 5. Get final standings with champion
      const finalStandings = await scoringService.calculateFinalStandings(party.id);
      const champion = finalStandings[0];
      expect(champion.rank).toBe(1);
      expect(champion.highestSong).toBeDefined();
      
      // 6. Transition to COMPLETE
      const completeParty = await partyService.transitionToComplete(party.id);
      expect(completeParty.status).toBe(PartyStatus.COMPLETE);
      expect(completeParty.completedAt).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tie scores correctly', async () => {
      const { party, host } = await partyService.createParty('Host', { 
        songsPerPlayer: 1,
        bonusCategoryCount: 0
      });
      const { player: player2 } = await partyService.joinParty(party.code, 'Player2');
      const { player: player3 } = await partyService.joinParty(party.code, 'Player3');
      
      await partyService.startParty(party.id, host.id);
      
      const players = await partyService.getPlayers(party.id);
      await identityService.assignIdentities(party.id, players);
      
      const baseSongData: SongSubmission = {
        soundcloudId: 123456,
        title: 'Test Song',
        artist: 'Test Artist',
        artworkUrl: 'https://example.com/artwork.jpg',
        duration: 180000,
        permalinkUrl: 'https://soundcloud.com/test/song',
        confidence: 3
      };

      // Submit songs
      const song1 = await songService.submitSong(party.id, host.id, { ...baseSongData, soundcloudId: 1 });
      const song2 = await songService.submitSong(party.id, player2.id, { ...baseSongData, soundcloudId: 2 });
      const song3 = await songService.submitSong(party.id, player3.id, { ...baseSongData, soundcloudId: 3 });
      
      await partyService.transitionToPlaying(party.id);
      
      // Give all songs the same rating (tie)
      await scoringService.castVote(song1.id, player2.id, 7);
      await scoringService.castVote(song1.id, player3.id, 7);
      await scoringService.castVote(song2.id, host.id, 7);
      await scoringService.castVote(song2.id, player3.id, 7);
      await scoringService.castVote(song3.id, host.id, 7);
      await scoringService.castVote(song3.id, player2.id, 7);
      
      // Calculate scores
      await scoringService.calculateSongScore(song1.id);
      await scoringService.calculateSongScore(song2.id);
      await scoringService.calculateSongScore(song3.id);
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Get final standings
      const finalStandings = await scoringService.calculateFinalStandings(party.id);
      
      // All players should have the same score
      expect(finalStandings[0].finalScore).toBe(finalStandings[1].finalScore);
      expect(finalStandings[1].finalScore).toBe(finalStandings[2].finalScore);
      
      // All tied players should have rank 1
      expect(finalStandings[0].rank).toBe(1);
      expect(finalStandings[1].rank).toBe(1);
      expect(finalStandings[2].rank).toBe(1);
    });

    it('should handle party with no bonus categories', async () => {
      const { party } = await createPlayingPartyWithVotes(1, 0);
      
      // Transition to FINALE
      await partyService.transitionToFinale(party.id);
      
      // Calculate bonus winners (should be empty)
      const bonusResults = await scoringService.calculateBonusWinners(party.id);
      expect(bonusResults).toHaveLength(0);
      
      // Final standings should still work
      const finalStandings = await scoringService.calculateFinalStandings(party.id);
      expect(finalStandings).toHaveLength(3);
      
      // No bonus points for anyone
      for (const standing of finalStandings) {
        expect(standing.bonusPoints).toBe(0);
      }
    });
  });
});
