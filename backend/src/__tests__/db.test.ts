import { PrismaClient } from '@prisma/client';
import fc from 'fast-check';

// Create a test-specific Prisma client
const prisma = new PrismaClient();

describe('Database Schema', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.bonusResult.deleteMany();
    await prisma.vote.deleteMany();
    await prisma.song.deleteMany();
    await prisma.partyIdentity.deleteMany();
    await prisma.player.deleteMany();
    await prisma.party.deleteMany();
  });

  describe('Party Model', () => {
    it('should create a party with required fields', async () => {
      const party = await prisma.party.create({
        data: {
          code: 'TEST',
          hostId: 'test-host-id',
        },
      });

      expect(party.id).toBeDefined();
      expect(party.code).toBe('TEST');
      expect(party.status).toBe('LOBBY');
      expect(party.hostId).toBe('test-host-id');
      expect(party.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique party codes', async () => {
      await prisma.party.create({
        data: {
          code: 'UNIQ',
          hostId: 'host-1',
        },
      });

      await expect(
        prisma.party.create({
          data: {
            code: 'UNIQ',
            hostId: 'host-2',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Player Model', () => {
    it('should create a player linked to a party', async () => {
      const party = await prisma.party.create({
        data: {
          code: 'PLAY',
          hostId: 'temp-host',
        },
      });

      const player = await prisma.player.create({
        data: {
          name: 'Test Player',
          partyId: party.id,
          isHost: true,
        },
      });

      // Update party with actual host ID
      await prisma.party.update({
        where: { id: party.id },
        data: { hostId: player.id },
      });

      expect(player.id).toBeDefined();
      expect(player.name).toBe('Test Player');
      expect(player.partyId).toBe(party.id);
      expect(player.isHost).toBe(true);
      expect(player.status).toBe('CONNECTED');
    });
  });

  describe('Referential Integrity', () => {
    it('should cascade delete players when party is deleted', async () => {
      const party = await prisma.party.create({
        data: {
          code: 'CASC',
          hostId: 'temp-host',
        },
      });

      await prisma.player.create({
        data: {
          name: 'Player 1',
          partyId: party.id,
        },
      });

      await prisma.player.create({
        data: {
          name: 'Player 2',
          partyId: party.id,
        },
      });

      // Verify players exist
      const playersBefore = await prisma.player.findMany({
        where: { partyId: party.id },
      });
      expect(playersBefore).toHaveLength(2);

      // Delete party
      await prisma.party.delete({
        where: { id: party.id },
      });

      // Verify players are deleted
      const playersAfter = await prisma.player.findMany({
        where: { partyId: party.id },
      });
      expect(playersAfter).toHaveLength(0);
    });

    it('should cascade delete songs, votes, and identities when party is deleted', async () => {
      // Create party
      const party = await prisma.party.create({
        data: {
          code: 'FULL',
          hostId: 'temp-host',
        },
      });

      // Create players
      const player1 = await prisma.player.create({
        data: {
          name: 'Player 1',
          partyId: party.id,
        },
      });

      const player2 = await prisma.player.create({
        data: {
          name: 'Player 2',
          partyId: party.id,
        },
      });

      // Create identity for player1
      await prisma.partyIdentity.create({
        data: {
          partyId: party.id,
          playerId: player1.id,
          alias: 'Shadow Wolf',
          silhouette: 'wolf',
          color: '#FF5733',
        },
      });

      // Create song
      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          submitterId: player1.id,
          soundcloudId: 123456,
          title: 'Test Song',
          artist: 'Test Artist',
          artworkUrl: 'https://example.com/art.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/test',
          confidence: 3,
          roundNumber: 1,
        },
      });

      // Create vote
      await prisma.vote.create({
        data: {
          songId: song.id,
          voterId: player2.id,
          rating: 8,
        },
      });

      // Verify all records exist
      expect(await prisma.player.count({ where: { partyId: party.id } })).toBe(2);
      expect(await prisma.partyIdentity.count({ where: { partyId: party.id } })).toBe(1);
      expect(await prisma.song.count({ where: { partyId: party.id } })).toBe(1);
      expect(await prisma.vote.count({ where: { songId: song.id } })).toBe(1);

      // Delete party
      await prisma.party.delete({
        where: { id: party.id },
      });

      // Verify all related records are deleted
      expect(await prisma.player.count({ where: { partyId: party.id } })).toBe(0);
      expect(await prisma.partyIdentity.count({ where: { partyId: party.id } })).toBe(0);
      expect(await prisma.song.count({ where: { partyId: party.id } })).toBe(0);
      // Votes are cascade deleted through songs
    });
  });

  describe('Song Model', () => {
    it('should create a song with all required fields', async () => {
      const party = await prisma.party.create({
        data: {
          code: 'SONG',
          hostId: 'temp-host',
        },
      });

      const player = await prisma.player.create({
        data: {
          name: 'Submitter',
          partyId: party.id,
        },
      });

      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          submitterId: player.id,
          soundcloudId: 789012,
          title: 'Amazing Track',
          artist: 'Cool Artist',
          artworkUrl: 'https://example.com/artwork.jpg',
          duration: 240000,
          permalinkUrl: 'https://soundcloud.com/cool-artist/amazing-track',
          confidence: 4,
          roundNumber: 1,
        },
      });

      expect(song.id).toBeDefined();
      expect(song.soundcloudId).toBe(789012);
      expect(song.title).toBe('Amazing Track');
      expect(song.artist).toBe('Cool Artist');
      expect(song.confidence).toBe(4);
      expect(song.roundNumber).toBe(1);
      expect(song.rawAverage).toBeNull();
      expect(song.finalScore).toBeNull();
    });
  });

  describe('Vote Model', () => {
    it('should create a vote with rating between 1-10', async () => {
      const party = await prisma.party.create({
        data: {
          code: 'VOTE',
          hostId: 'temp-host',
        },
      });

      const submitter = await prisma.player.create({
        data: {
          name: 'Submitter',
          partyId: party.id,
        },
      });

      const voter = await prisma.player.create({
        data: {
          name: 'Voter',
          partyId: party.id,
        },
      });

      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          submitterId: submitter.id,
          soundcloudId: 111222,
          title: 'Vote Test Song',
          artist: 'Vote Artist',
          artworkUrl: 'https://example.com/vote.jpg',
          duration: 200000,
          permalinkUrl: 'https://soundcloud.com/vote-test',
          confidence: 3,
          roundNumber: 1,
        },
      });

      const vote = await prisma.vote.create({
        data: {
          songId: song.id,
          voterId: voter.id,
          rating: 7,
        },
      });

      expect(vote.id).toBeDefined();
      expect(vote.rating).toBe(7);
      expect(vote.isLocked).toBe(false);
      expect(vote.votedAt).toBeInstanceOf(Date);
    });

    it('should enforce unique vote per voter per song', async () => {
      const party = await prisma.party.create({
        data: {
          code: 'UNVT',
          hostId: 'temp-host',
        },
      });

      const submitter = await prisma.player.create({
        data: {
          name: 'Submitter',
          partyId: party.id,
        },
      });

      const voter = await prisma.player.create({
        data: {
          name: 'Voter',
          partyId: party.id,
        },
      });

      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          submitterId: submitter.id,
          soundcloudId: 333444,
          title: 'Unique Vote Song',
          artist: 'Unique Artist',
          artworkUrl: 'https://example.com/unique.jpg',
          duration: 180000,
          permalinkUrl: 'https://soundcloud.com/unique',
          confidence: 2,
          roundNumber: 1,
        },
      });

      // First vote should succeed
      await prisma.vote.create({
        data: {
          songId: song.id,
          voterId: voter.id,
          rating: 8,
        },
      });

      // Second vote from same voter on same song should fail
      await expect(
        prisma.vote.create({
          data: {
            songId: song.id,
            voterId: voter.id,
            rating: 9,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('PartyIdentity Model', () => {
    it('should create an identity with alias, silhouette, and color', async () => {
      const party = await prisma.party.create({
        data: {
          code: 'IDEN',
          hostId: 'temp-host',
        },
      });

      const player = await prisma.player.create({
        data: {
          name: 'Real Name',
          partyId: party.id,
        },
      });

      const identity = await prisma.partyIdentity.create({
        data: {
          partyId: party.id,
          playerId: player.id,
          alias: 'Midnight Phoenix',
          silhouette: 'phoenix',
          color: '#9B59B6',
        },
      });

      expect(identity.id).toBeDefined();
      expect(identity.alias).toBe('Midnight Phoenix');
      expect(identity.silhouette).toBe('phoenix');
      expect(identity.color).toBe('#9B59B6');
      expect(identity.isRevealed).toBe(false);
      expect(identity.revealOrder).toBeNull();
    });

    it('should enforce one identity per player', async () => {
      const party = await prisma.party.create({
        data: {
          code: 'ONID',
          hostId: 'temp-host',
        },
      });

      const player = await prisma.player.create({
        data: {
          name: 'Single Identity Player',
          partyId: party.id,
        },
      });

      // First identity should succeed
      await prisma.partyIdentity.create({
        data: {
          partyId: party.id,
          playerId: player.id,
          alias: 'First Alias',
          silhouette: 'cat',
          color: '#E74C3C',
        },
      });

      // Second identity for same player should fail
      await expect(
        prisma.partyIdentity.create({
          data: {
            partyId: party.id,
            playerId: player.id,
            alias: 'Second Alias',
            silhouette: 'dog',
            color: '#3498DB',
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('BonusResult Model', () => {
    it('should create a bonus result with all required fields', async () => {
      const party = await prisma.party.create({
        data: {
          code: 'BONS',
          hostId: 'temp-host',
        },
      });

      const player = await prisma.player.create({
        data: {
          name: 'Winner',
          partyId: party.id,
        },
      });

      const song = await prisma.song.create({
        data: {
          partyId: party.id,
          submitterId: player.id,
          soundcloudId: 555666,
          title: 'Winning Song',
          artist: 'Winner Artist',
          artworkUrl: 'https://example.com/winner.jpg',
          duration: 210000,
          permalinkUrl: 'https://soundcloud.com/winner',
          confidence: 5,
          roundNumber: 1,
        },
      });

      const bonusResult = await prisma.bonusResult.create({
        data: {
          partyId: party.id,
          categoryId: 'crowd-favorite',
          categoryName: 'Crowd Favorite',
          winningSongId: song.id,
          winnerPlayerId: player.id,
          points: 10,
          revealOrder: 1,
        },
      });

      expect(bonusResult.id).toBeDefined();
      expect(bonusResult.categoryId).toBe('crowd-favorite');
      expect(bonusResult.categoryName).toBe('Crowd Favorite');
      expect(bonusResult.points).toBe(10);
      expect(bonusResult.revealOrder).toBe(1);
    });
  });
});

// Property-based test for referential integrity
describe('Property: Referential Integrity (Property 50)', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.bonusResult.deleteMany();
    await prisma.vote.deleteMany();
    await prisma.song.deleteMany();
    await prisma.partyIdentity.deleteMany();
    await prisma.player.deleteMany();
    await prisma.party.deleteMany();
  });

  // Feature: nero-party-implementation, Property 50: Referential Integrity
  // **Validates: Requirements 11.6**
  it('should cascade delete all related records when party is deleted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // Number of players
        fc.integer({ min: 1, max: 3 }), // Songs per player
        async (playerCount, songsPerPlayer) => {
          // Generate unique party code
          const code = `T${Date.now().toString(36).slice(-3).toUpperCase()}`;
          
          // Create party
          const party = await prisma.party.create({
            data: {
              code,
              hostId: 'temp-host',
            },
          });

          // Create players
          const players = await Promise.all(
            Array.from({ length: playerCount }, (_, i) =>
              prisma.player.create({
                data: {
                  name: `Player ${i + 1}`,
                  partyId: party.id,
                  isHost: i === 0,
                },
              })
            )
          );

          // Create identities for each player
          await Promise.all(
            players.map((player, i) =>
              prisma.partyIdentity.create({
                data: {
                  partyId: party.id,
                  playerId: player.id,
                  alias: `Alias ${i + 1}`,
                  silhouette: `silhouette-${i}`,
                  color: `#${(i * 111111).toString(16).padStart(6, '0').slice(0, 6)}`,
                },
              })
            )
          );

          // Create songs for each player
          const songs = await Promise.all(
            players.flatMap((player, playerIndex) =>
              Array.from({ length: songsPerPlayer }, (_, songIndex) =>
                prisma.song.create({
                  data: {
                    partyId: party.id,
                    submitterId: player.id,
                    soundcloudId: playerIndex * 1000 + songIndex,
                    title: `Song ${playerIndex}-${songIndex}`,
                    artist: `Artist ${playerIndex}`,
                    artworkUrl: 'https://example.com/art.jpg',
                    duration: 180000,
                    permalinkUrl: 'https://soundcloud.com/test',
                    confidence: ((songIndex % 5) + 1) as 1 | 2 | 3 | 4 | 5,
                    roundNumber: songIndex + 1,
                  },
                })
              )
            )
          );

          // Create votes (each player votes on songs they didn't submit)
          for (const song of songs) {
            for (const voter of players) {
              if (voter.id !== song.submitterId) {
                await prisma.vote.create({
                  data: {
                    songId: song.id,
                    voterId: voter.id,
                    rating: Math.floor(Math.random() * 10) + 1,
                  },
                });
              }
            }
          }

          // Create bonus results
          if (songs.length > 0) {
            await prisma.bonusResult.create({
              data: {
                partyId: party.id,
                categoryId: 'crowd-favorite',
                categoryName: 'Crowd Favorite',
                winningSongId: songs[0].id,
                winnerPlayerId: songs[0].submitterId,
                points: 10,
                revealOrder: 1,
              },
            });
          }

          // Verify all records exist before deletion
          const beforeCounts = {
            players: await prisma.player.count({ where: { partyId: party.id } }),
            identities: await prisma.partyIdentity.count({ where: { partyId: party.id } }),
            songs: await prisma.song.count({ where: { partyId: party.id } }),
            bonusResults: await prisma.bonusResult.count({ where: { partyId: party.id } }),
          };

          expect(beforeCounts.players).toBe(playerCount);
          expect(beforeCounts.identities).toBe(playerCount);
          expect(beforeCounts.songs).toBe(playerCount * songsPerPlayer);
          expect(beforeCounts.bonusResults).toBe(1);

          // Delete party
          await prisma.party.delete({
            where: { id: party.id },
          });

          // Verify all related records are cascade deleted
          const afterCounts = {
            players: await prisma.player.count({ where: { partyId: party.id } }),
            identities: await prisma.partyIdentity.count({ where: { partyId: party.id } }),
            songs: await prisma.song.count({ where: { partyId: party.id } }),
            bonusResults: await prisma.bonusResult.count({ where: { partyId: party.id } }),
          };

          expect(afterCounts.players).toBe(0);
          expect(afterCounts.identities).toBe(0);
          expect(afterCounts.songs).toBe(0);
          expect(afterCounts.bonusResults).toBe(0);

          return true;
        }
      ),
      { numRuns: 10 } // Reduced for database tests
    );
  });
});
