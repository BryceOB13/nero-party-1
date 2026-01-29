import { SoundCloudService, SoundCloudAuthToken } from '../soundcloud.service';
import { SoundCloudTrack } from '../../types';

// Mock the env module
jest.mock('../../env', () => ({
  env: {
    SOUNDCLOUD_CLIENT_ID: 'test-client-id',
    SOUNDCLOUD_CLIENT_SECRET: 'test-client-secret',
  },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

/**
 * Helper function to create a mock SoundCloud API track response
 */
function createMockApiTrack(overrides: Partial<any> = {}): any {
  return {
    id: 123456789,
    title: 'Test Track',
    description: 'A test track description',
    duration: 180000, // 3 minutes in milliseconds
    genre: 'Electronic',
    user: {
      id: 987654321,
      username: 'TestArtist',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    artwork_url: 'https://example.com/artwork.jpg',
    waveform_url: 'https://example.com/waveform.json',
    stream_url: 'https://api.soundcloud.com/tracks/123456789/stream',
    permalink_url: 'https://soundcloud.com/testartist/test-track',
    playback_count: 1000,
    likes_count: 100,
    access: 'playable',
    streamable: true,
    ...overrides,
  };
}

describe('SoundCloudService', () => {
  let service: SoundCloudService;

  beforeEach(() => {
    // Create a fresh instance for each test
    service = new SoundCloudService();
    // Clear all mocks
    mockFetch.mockClear();
  });

  afterEach(() => {
    service.clearCache();
  });

  describe('hasCredentials', () => {
    it('should return true when both client ID and secret are configured', () => {
      expect(service.hasCredentials()).toBe(true);
    });

    it('should return false when client ID is empty', () => {
      // Create a service with mocked empty credentials
      jest.resetModules();
      jest.doMock('../../env', () => ({
        env: {
          SOUNDCLOUD_CLIENT_ID: '',
          SOUNDCLOUD_CLIENT_SECRET: 'test-secret',
        },
      }));
      
      // Re-import to get the mocked version
      const { SoundCloudService: MockedService } = require('../soundcloud.service');
      const emptyIdService = new MockedService();
      
      expect(emptyIdService.hasCredentials()).toBe(false);
      
      // Restore original mock
      jest.resetModules();
      jest.doMock('../../env', () => ({
        env: {
          SOUNDCLOUD_CLIENT_ID: 'test-client-id',
          SOUNDCLOUD_CLIENT_SECRET: 'test-client-secret',
        },
      }));
    });
  });

  describe('authenticate', () => {
    /**
     * Tests for Requirement 12.1:
     * WHEN the Backend initializes, THE Backend SHALL authenticate with the SoundCloud_API using Client Credentials OAuth flow
     */
    describe('Client Credentials OAuth flow (Requirement 12.1)', () => {
      it('should authenticate using client credentials grant type', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        const result = await service.authenticate();

        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.soundcloud.com/oauth2/token',
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
        );

        // Verify the body contains correct grant_type
        const callArgs = mockFetch.mock.calls[0];
        const body = callArgs[1].body;
        expect(body).toContain('grant_type=client_credentials');
        expect(body).toContain('client_id=test-client-id');
        expect(body).toContain('client_secret=test-client-secret');

        expect(result).toEqual(mockTokenResponse);
      });

      it('should return the access token from the response', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'my-access-token-123',
          refresh_token: 'my-refresh-token-456',
          expires_in: 7200,
          scope: 'read write',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        const result = await service.authenticate();

        expect(result.access_token).toBe('my-access-token-123');
        expect(result.refresh_token).toBe('my-refresh-token-456');
        expect(result.expires_in).toBe(7200);
        expect(result.scope).toBe('read write');
      });

      it('should cache the token after successful authentication', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'cached-access-token',
          refresh_token: 'cached-refresh-token',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        await service.authenticate();

        const cachedToken = service.getCachedToken();
        expect(cachedToken).not.toBeNull();
        expect(cachedToken?.accessToken).toBe('cached-access-token');
        expect(cachedToken?.refreshToken).toBe('cached-refresh-token');
      });

      it('should throw error with SOUNDCLOUD_AUTH_FAILED code on authentication failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        });

        try {
          await service.authenticate();
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('SOUNDCLOUD_AUTH_FAILED');
          expect(error.message).toContain('401');
        }
      });

      it('should throw error with SOUNDCLOUD_AUTH_FAILED code on network error', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        try {
          await service.authenticate();
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('SOUNDCLOUD_AUTH_FAILED');
          expect(error.message).toContain('Network error');
        }
      });
    });
  });

  describe('refreshAccessToken', () => {
    /**
     * Tests for Requirement 12.6:
     * THE Backend SHALL cache SoundCloud authentication tokens and refresh them before expiration
     */
    describe('Token refresh (Requirement 12.6)', () => {
      it('should refresh token using refresh_token grant type', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        const result = await service.refreshAccessToken('old-refresh-token');

        expect(mockFetch).toHaveBeenCalledTimes(1);
        
        // Verify the body contains correct grant_type
        const callArgs = mockFetch.mock.calls[0];
        const body = callArgs[1].body;
        expect(body).toContain('grant_type=refresh_token');
        expect(body).toContain('refresh_token=old-refresh-token');
        expect(body).toContain('client_id=test-client-id');
        expect(body).toContain('client_secret=test-client-secret');

        expect(result).toEqual(mockTokenResponse);
      });

      it('should update the cached token after refresh', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'refreshed-access-token',
          refresh_token: 'refreshed-refresh-token',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        await service.refreshAccessToken('old-refresh-token');

        const cachedToken = service.getCachedToken();
        expect(cachedToken?.accessToken).toBe('refreshed-access-token');
        expect(cachedToken?.refreshToken).toBe('refreshed-refresh-token');
      });

      it('should throw error with SOUNDCLOUD_AUTH_FAILED code on refresh failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Invalid refresh token',
        });

        try {
          await service.refreshAccessToken('invalid-refresh-token');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('SOUNDCLOUD_AUTH_FAILED');
          expect(error.message).toContain('400');
        }
      });
    });
  });

  describe('Token caching and expiration', () => {
    /**
     * Tests for Requirement 12.6:
     * THE Backend SHALL cache SoundCloud authentication tokens and refresh them before expiration
     */
    describe('Token caching (Requirement 12.6)', () => {
      it('should report token as expired when no token is cached', () => {
        expect(service.isTokenExpired()).toBe(true);
      });

      it('should report token as not expired when recently cached', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_in: 3600, // 1 hour
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        await service.authenticate();

        expect(service.isTokenExpired()).toBe(false);
      });

      it('should report token as expired when within 5 minute buffer', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_in: 240, // 4 minutes (less than 5 minute buffer)
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        await service.authenticate();

        // Token should be considered expired because it's within the 5-minute buffer
        expect(service.isTokenExpired()).toBe(true);
      });

      it('should correctly calculate time until expiration', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_in: 3600, // 1 hour
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        await service.authenticate();

        const timeUntilExpiration = service.getTimeUntilExpiration();
        
        // Should be approximately 1 hour (3600000 ms), allow some tolerance
        expect(timeUntilExpiration).toBeGreaterThan(3590000);
        expect(timeUntilExpiration).toBeLessThanOrEqual(3600000);
      });

      it('should return 0 for time until expiration when no token cached', () => {
        expect(service.getTimeUntilExpiration()).toBe(0);
      });

      it('should clear cache when clearCache is called', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        await service.authenticate();
        expect(service.getCachedToken()).not.toBeNull();

        service.clearCache();
        expect(service.getCachedToken()).toBeNull();
      });

      it('should return token expiration date', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        const beforeAuth = new Date();
        await service.authenticate();
        const afterAuth = new Date();

        const expiration = service.getTokenExpiration();
        expect(expiration).not.toBeNull();
        
        // Expiration should be approximately 1 hour from now
        const expectedMin = new Date(beforeAuth.getTime() + 3600000);
        const expectedMax = new Date(afterAuth.getTime() + 3600000);
        
        expect(expiration!.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
        expect(expiration!.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
      });

      it('should return null for expiration when no token cached', () => {
        expect(service.getTokenExpiration()).toBeNull();
      });
    });

    describe('willExpireWithin', () => {
      it('should return true when no token is cached', () => {
        expect(service.willExpireWithin(5)).toBe(true);
      });

      it('should return false when token has plenty of time left', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_in: 3600, // 1 hour
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        await service.authenticate();

        expect(service.willExpireWithin(5)).toBe(false);
        expect(service.willExpireWithin(30)).toBe(false);
      });

      it('should return true when token will expire within specified time', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          expires_in: 180, // 3 minutes
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        await service.authenticate();

        expect(service.willExpireWithin(5)).toBe(true);
        expect(service.willExpireWithin(2)).toBe(false);
      });
    });
  });

  describe('getValidAccessToken', () => {
    /**
     * Tests for Requirement 12.6:
     * THE Backend SHALL cache SoundCloud authentication tokens and refresh them before expiration
     */
    describe('Automatic token management (Requirement 12.6)', () => {
      it('should authenticate when no token is cached', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'fresh-token',
          refresh_token: 'fresh-refresh',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        const token = await service.getValidAccessToken();

        expect(token).toBe('fresh-token');
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should return cached token when not expired', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'cached-token',
          refresh_token: 'cached-refresh',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        // First call - authenticates
        await service.getValidAccessToken();
        
        // Second call - should use cache
        const token = await service.getValidAccessToken();

        expect(token).toBe('cached-token');
        expect(mockFetch).toHaveBeenCalledTimes(1); // Only one call
      });

      it('should refresh token when expired', async () => {
        // First authentication
        const initialToken: SoundCloudAuthToken = {
          access_token: 'initial-token',
          refresh_token: 'initial-refresh',
          expires_in: 60, // Very short expiration (within 5 min buffer)
          scope: '*',
        };

        // Refreshed token
        const refreshedToken: SoundCloudAuthToken = {
          access_token: 'refreshed-token',
          refresh_token: 'refreshed-refresh',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => initialToken,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => refreshedToken,
          });

        // First call - authenticates
        await service.authenticate();
        
        // Token is within 5-minute buffer, so should refresh
        const token = await service.getValidAccessToken();

        expect(token).toBe('refreshed-token');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should re-authenticate if refresh fails', async () => {
        // First authentication
        const initialToken: SoundCloudAuthToken = {
          access_token: 'initial-token',
          refresh_token: 'initial-refresh',
          expires_in: 60, // Very short expiration
          scope: '*',
        };

        // Re-authenticated token
        const reAuthToken: SoundCloudAuthToken = {
          access_token: 'reauth-token',
          refresh_token: 'reauth-refresh',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => initialToken,
          })
          .mockResolvedValueOnce({
            ok: false,
            status: 400,
            text: async () => 'Invalid refresh token',
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => reAuthToken,
          });

        // First call - authenticates
        await service.authenticate();
        
        // Token is expired, refresh fails, should re-authenticate
        const token = await service.getValidAccessToken();

        expect(token).toBe('reauth-token');
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('initialize', () => {
    /**
     * Tests for Requirement 12.1:
     * WHEN the Backend initializes, THE Backend SHALL authenticate with the SoundCloud_API using Client Credentials OAuth flow
     */
    describe('Backend initialization (Requirement 12.1)', () => {
      it('should authenticate on initialization', async () => {
        const mockTokenResponse: SoundCloudAuthToken = {
          access_token: 'init-token',
          refresh_token: 'init-refresh',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        const result = await service.initialize();

        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(service.getCachedToken()?.accessToken).toBe('init-token');
      });

      it('should return false when credentials are not configured', async () => {
        // Create a service with mocked empty credentials
        jest.resetModules();
        jest.doMock('../../env', () => ({
          env: {
            SOUNDCLOUD_CLIENT_ID: '',
            SOUNDCLOUD_CLIENT_SECRET: '',
          },
        }));
        
        const { SoundCloudService: MockedService } = require('../soundcloud.service');
        const noCredService = new MockedService();
        
        const result = await noCredService.initialize();
        
        expect(result).toBe(false);
        expect(mockFetch).not.toHaveBeenCalled();
        
        // Restore original mock
        jest.resetModules();
        jest.doMock('../../env', () => ({
          env: {
            SOUNDCLOUD_CLIENT_ID: 'test-client-id',
            SOUNDCLOUD_CLIENT_SECRET: 'test-client-secret',
          },
        }));
      });

      it('should throw error on authentication failure during initialization', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        });

        await expect(service.initialize()).rejects.toThrow();
      });
    });
  });

  describe('searchTracks', () => {
    /**
     * Helper to set up authenticated service
     */
    async function setupAuthenticatedService(): Promise<void> {
      const mockTokenResponse: SoundCloudAuthToken = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        scope: '*',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      await service.authenticate();
    }

    /**
     * Tests for Requirement 4.1:
     * WHEN a Player searches for a song, THE Backend SHALL query the SoundCloud_API with the search term and return results
     */
    describe('Search functionality (Requirement 4.1)', () => {
      it('should query SoundCloud API with the search term', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack()];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        await service.searchTracks('test query');

        // Verify the search request was made
        expect(mockFetch).toHaveBeenCalledTimes(2); // 1 for auth, 1 for search
        const searchCall = mockFetch.mock.calls[1];
        expect(searchCall[0]).toContain('/tracks');
        expect(searchCall[0]).toContain('q=test+query');
      });

      it('should return search results from the API', async () => {
        await setupAuthenticatedService();

        const mockTracks = [
          createMockApiTrack({ id: 1, title: 'Track 1' }),
          createMockApiTrack({ id: 2, title: 'Track 2' }),
        ];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        const results = await service.searchTracks('test');

        expect(results).toHaveLength(2);
        expect(results[0].title).toBe('Track 1');
        expect(results[1].title).toBe('Track 2');
      });

      it('should return empty array for empty query', async () => {
        const results = await service.searchTracks('');
        expect(results).toEqual([]);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should return empty array for whitespace-only query', async () => {
        const results = await service.searchTracks('   ');
        expect(results).toEqual([]);
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should trim whitespace from query', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack()];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        await service.searchTracks('  test query  ');

        const searchCall = mockFetch.mock.calls[1];
        expect(searchCall[0]).toContain('q=test+query');
      });
    });

    /**
     * Tests for Requirement 12.2:
     * WHEN a search request is made, THE Backend SHALL query the SoundCloud_API /tracks endpoint with the search query and access=playable filter
     */
    describe('Playable filter (Requirement 12.2)', () => {
      it('should include access=playable filter in the request', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack()];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        await service.searchTracks('test');

        const searchCall = mockFetch.mock.calls[1];
        expect(searchCall[0]).toContain('access=playable');
      });

      it('should query the /tracks endpoint', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack()];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        await service.searchTracks('test');

        const searchCall = mockFetch.mock.calls[1];
        expect(searchCall[0]).toContain('https://api.soundcloud.com/tracks');
      });

      it('should include OAuth authorization header', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack()];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        await service.searchTracks('test');

        const searchCall = mockFetch.mock.calls[1];
        expect(searchCall[1].headers).toEqual(
          expect.objectContaining({
            'Authorization': 'OAuth test-access-token',
          })
        );
      });
    });

    /**
     * Tests for Requirement 12.3:
     * WHEN search results are returned, THE Backend SHALL extract and return track_id, title, artist, artwork_url, duration, and permalink
     */
    describe('Track metadata extraction (Requirement 12.3)', () => {
      it('should extract track_id from results', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack({ id: 123456789 })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        const results = await service.searchTracks('test');

        expect(results[0].id).toBe(123456789);
      });

      it('should extract title from results', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack({ title: 'My Awesome Track' })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        const results = await service.searchTracks('test');

        expect(results[0].title).toBe('My Awesome Track');
      });

      it('should extract artist (username) from results', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack({ user: { id: 1, username: 'CoolArtist', avatar_url: null } })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        const results = await service.searchTracks('test');

        expect(results[0].user.username).toBe('CoolArtist');
      });

      it('should extract artwork_url from results', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack({ artwork_url: 'https://example.com/artwork.jpg' })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        const results = await service.searchTracks('test');

        expect(results[0].artwork_url).toBe('https://example.com/artwork.jpg');
      });

      it('should handle null artwork_url', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack({ artwork_url: null })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        const results = await service.searchTracks('test');

        expect(results[0].artwork_url).toBeNull();
      });

      it('should extract duration from results', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack({ duration: 240000 })]; // 4 minutes
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        const results = await service.searchTracks('test');

        expect(results[0].duration).toBe(240000);
      });

      it('should extract permalink from results', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack({ permalink_url: 'https://soundcloud.com/artist/track' })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        const results = await service.searchTracks('test');

        expect(results[0].permalink_url).toBe('https://soundcloud.com/artist/track');
      });

      it('should handle null description by converting to empty string', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack({ description: null })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        const results = await service.searchTracks('test');

        expect(results[0].description).toBe('');
      });

      it('should handle null genre by converting to empty string', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack({ genre: null })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        const results = await service.searchTracks('test');

        expect(results[0].genre).toBe('');
      });

      it('should extract all required metadata fields', async () => {
        await setupAuthenticatedService();

        const mockTrack = createMockApiTrack({
          id: 999,
          title: 'Complete Track',
          description: 'Full description',
          duration: 300000,
          genre: 'Rock',
          user: { id: 111, username: 'FullArtist', avatar_url: 'https://avatar.url' },
          artwork_url: 'https://artwork.url',
          waveform_url: 'https://waveform.url',
          stream_url: 'https://stream.url',
          permalink_url: 'https://permalink.url',
          playback_count: 5000,
          likes_count: 500,
          access: 'playable',
          streamable: true,
        });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => [mockTrack],
        });

        const results = await service.searchTracks('test');

        expect(results[0]).toEqual({
          id: 999,
          title: 'Complete Track',
          description: 'Full description',
          duration: 300000,
          genre: 'Rock',
          user: { id: 111, username: 'FullArtist', avatar_url: 'https://avatar.url' },
          artwork_url: 'https://artwork.url',
          waveform_url: 'https://waveform.url',
          stream_url: 'https://stream.url',
          permalink_url: 'https://permalink.url',
          playback_count: 5000,
          likes_count: 500,
          access: 'playable',
          streamable: true,
        });
      });
    });

    /**
     * Tests for Requirement 14.3:
     * WHEN the SoundCloud_API is unavailable, THE Backend SHALL return an error with the message "Music service unavailable"
     */
    describe('API unavailable error handling (Requirement 14.3)', () => {
      it('should throw MUSIC_SERVICE_UNAVAILABLE error on 500 status', async () => {
        await setupAuthenticatedService();

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        });

        try {
          await service.searchTracks('test');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('MUSIC_SERVICE_UNAVAILABLE');
          expect(error.message).toBe('Music service unavailable');
        }
      });

      it('should throw MUSIC_SERVICE_UNAVAILABLE error on 502 status', async () => {
        await setupAuthenticatedService();

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 502,
          text: async () => 'Bad Gateway',
        });

        try {
          await service.searchTracks('test');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('MUSIC_SERVICE_UNAVAILABLE');
          expect(error.message).toBe('Music service unavailable');
        }
      });

      it('should throw MUSIC_SERVICE_UNAVAILABLE error on 503 status', async () => {
        await setupAuthenticatedService();

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
        });

        try {
          await service.searchTracks('test');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('MUSIC_SERVICE_UNAVAILABLE');
          expect(error.message).toBe('Music service unavailable');
        }
      });

      it('should throw MUSIC_SERVICE_UNAVAILABLE error on network failure', async () => {
        await setupAuthenticatedService();

        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        try {
          await service.searchTracks('test');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('MUSIC_SERVICE_UNAVAILABLE');
          expect(error.message).toBe('Music service unavailable');
        }
      });
    });

    describe('Other error handling', () => {
      it('should throw SOUNDCLOUD_AUTH_FAILED error on 401 status', async () => {
        await setupAuthenticatedService();

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        });

        try {
          await service.searchTracks('test');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('SOUNDCLOUD_AUTH_FAILED');
        }
      });

      it('should clear cache on 401 error', async () => {
        await setupAuthenticatedService();
        expect(service.getCachedToken()).not.toBeNull();

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        });

        try {
          await service.searchTracks('test');
        } catch (error) {
          // Expected
        }

        expect(service.getCachedToken()).toBeNull();
      });

      it('should throw SOUNDCLOUD_API_ERROR error on 429 rate limit', async () => {
        await setupAuthenticatedService();

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Too Many Requests',
        });

        try {
          await service.searchTracks('test');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('SOUNDCLOUD_API_ERROR');
          expect(error.message).toContain('Rate limit');
        }
      });

      it('should throw SOUNDCLOUD_API_ERROR error on 400 bad request', async () => {
        await setupAuthenticatedService();

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Bad Request',
        });

        try {
          await service.searchTracks('test');
          fail('Expected error to be thrown');
        } catch (error: any) {
          expect(error.code).toBe('SOUNDCLOUD_API_ERROR');
        }
      });
    });

    describe('Limit parameter', () => {
      it('should use default limit of 20', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack()];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        await service.searchTracks('test');

        const searchCall = mockFetch.mock.calls[1];
        expect(searchCall[0]).toContain('limit=20');
      });

      it('should use custom limit when provided', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack()];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        await service.searchTracks('test', 10);

        const searchCall = mockFetch.mock.calls[1];
        expect(searchCall[0]).toContain('limit=10');
      });

      it('should cap limit at 50', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack()];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        await service.searchTracks('test', 100);

        const searchCall = mockFetch.mock.calls[1];
        expect(searchCall[0]).toContain('limit=50');
      });

      it('should enforce minimum limit of 1', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack()];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        await service.searchTracks('test', 0);

        const searchCall = mockFetch.mock.calls[1];
        expect(searchCall[0]).toContain('limit=1');
      });

      it('should handle negative limit by using minimum', async () => {
        await setupAuthenticatedService();

        const mockTracks = [createMockApiTrack()];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTracks,
        });

        await service.searchTracks('test', -5);

        const searchCall = mockFetch.mock.calls[1];
        expect(searchCall[0]).toContain('limit=1');
      });
    });

    describe('Token refresh during search', () => {
      it('should automatically refresh token if expired before search', async () => {
        // Initial authentication with short expiration
        const initialToken: SoundCloudAuthToken = {
          access_token: 'initial-token',
          refresh_token: 'initial-refresh',
          expires_in: 60, // Very short, within 5-min buffer
          scope: '*',
        };

        // Refreshed token
        const refreshedToken: SoundCloudAuthToken = {
          access_token: 'refreshed-token',
          refresh_token: 'refreshed-refresh',
          expires_in: 3600,
          scope: '*',
        };

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => initialToken,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => refreshedToken,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => [createMockApiTrack()],
          });

        await service.authenticate();
        await service.searchTracks('test');

        // Should have made 3 calls: initial auth, refresh, search
        expect(mockFetch).toHaveBeenCalledTimes(3);
        
        // Search should use refreshed token
        const searchCall = mockFetch.mock.calls[2];
        expect(searchCall[1].headers['Authorization']).toBe('OAuth refreshed-token');
      });
    });
  });
});
