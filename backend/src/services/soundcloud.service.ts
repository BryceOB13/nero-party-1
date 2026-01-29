import { env } from '../env';
import { SoundCloudTrack } from '../types';
import { AppError, ServerErrorCode } from '../types/errors';

/**
 * SoundCloud OAuth token response interface
 */
export interface SoundCloudAuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
}

/**
 * SoundCloud API track response interface (raw API response)
 * This maps to the actual SoundCloud API response format
 */
interface SoundCloudApiTrack {
  id: number;
  title: string;
  description: string | null;
  duration: number;
  genre: string | null;
  user: {
    id: number;
    username: string;
    avatar_url: string | null;
  };
  artwork_url: string | null;
  waveform_url: string;
  stream_url?: string;
  permalink_url: string;
  playback_count: number;
  likes_count: number;
  access: 'playable' | 'preview' | 'blocked';
  streamable: boolean;
}

/**
 * Internal token cache structure with expiration tracking
 */
interface CachedToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string;
}

/**
 * SoundCloud API base URL
 */
const SOUNDCLOUD_API_BASE = 'https://api.soundcloud.com';
const SOUNDCLOUD_AUTH_URL = 'https://api.soundcloud.com/oauth2/token';

/**
 * Token refresh buffer in milliseconds (5 minutes before expiration)
 * 
 * **Validates: Requirements 12.6**
 * - 12.6: THE Backend SHALL cache SoundCloud authentication tokens and refresh them before expiration
 */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * SoundCloudService handles OAuth authentication and token management for the SoundCloud API.
 * 
 * **Validates: Requirements 12.1, 12.6**
 * - 12.1: WHEN the Backend initializes, THE Backend SHALL authenticate with the SoundCloud_API using Client Credentials OAuth flow
 * - 12.6: THE Backend SHALL cache SoundCloud authentication tokens and refresh them before expiration
 */
export class SoundCloudService {
  private cachedToken: CachedToken | null = null;

  /**
   * Gets the SoundCloud client ID from environment variables.
   */
  get clientId(): string {
    return env.SOUNDCLOUD_CLIENT_ID;
  }

  /**
   * Gets the SoundCloud client secret from environment variables.
   */
  get clientSecret(): string {
    return env.SOUNDCLOUD_CLIENT_SECRET;
  }

  /**
   * Checks if the service has valid credentials configured.
   * 
   * @returns true if both client ID and secret are configured
   */
  hasCredentials(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  /**
   * Authenticates with SoundCloud using the Client Credentials OAuth flow.
   * This is the initial authentication method called when the backend initializes.
   * 
   * **Validates: Requirements 12.1**
   * - 12.1: WHEN the Backend initializes, THE Backend SHALL authenticate with the SoundCloud_API using Client Credentials OAuth flow
   * 
   * @returns The authentication token response
   * @throws AppError if credentials are not configured (SOUNDCLOUD_AUTH_FAILED)
   * @throws AppError if authentication fails (SOUNDCLOUD_AUTH_FAILED)
   */
  async authenticate(): Promise<SoundCloudAuthToken> {
    if (!this.hasCredentials()) {
      throw new AppError(
        ServerErrorCode.SOUNDCLOUD_AUTH_FAILED,
        'SoundCloud credentials not configured'
      );
    }

    try {
      const response = await fetch(SOUNDCLOUD_AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        await this.handleAuthError(response);
      }

      const tokenData: SoundCloudAuthToken = await response.json();
      
      // Cache the token
      this.cacheToken(tokenData);

      return tokenData;
    } catch (error: unknown) {
      // Re-throw if already an AppError
      if (error instanceof AppError) {
        throw error;
      }
      
      // Wrap network errors
      throw new AppError(
        ServerErrorCode.SOUNDCLOUD_AUTH_FAILED,
        `SoundCloud authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Refreshes the access token using the refresh token.
   * 
   * **Validates: Requirements 12.6**
   * - 12.6: THE Backend SHALL cache SoundCloud authentication tokens and refresh them before expiration
   * 
   * @param refreshToken - The refresh token to use
   * @returns The new authentication token response
   * @throws AppError if credentials are not configured (SOUNDCLOUD_AUTH_FAILED)
   * @throws AppError if refresh fails (SOUNDCLOUD_AUTH_FAILED)
   */
  async refreshAccessToken(refreshToken: string): Promise<SoundCloudAuthToken> {
    if (!this.hasCredentials()) {
      throw new AppError(
        ServerErrorCode.SOUNDCLOUD_AUTH_FAILED,
        'SoundCloud credentials not configured'
      );
    }

    try {
      const response = await fetch(SOUNDCLOUD_AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
        }).toString(),
      });

      if (!response.ok) {
        await this.handleAuthError(response);
      }

      const tokenData: SoundCloudAuthToken = await response.json();
      
      // Cache the new token
      this.cacheToken(tokenData);

      return tokenData;
    } catch (error: unknown) {
      // Re-throw if already an AppError
      if (error instanceof AppError) {
        throw error;
      }
      
      // Wrap network errors
      throw new AppError(
        ServerErrorCode.SOUNDCLOUD_AUTH_FAILED,
        `SoundCloud token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Caches the authentication token with expiration tracking.
   * 
   * **Validates: Requirements 12.6**
   * - 12.6: THE Backend SHALL cache SoundCloud authentication tokens and refresh them before expiration
   * 
   * @param tokenData - The token data to cache
   */
  private cacheToken(tokenData: SoundCloudAuthToken): void {
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);
    
    this.cachedToken = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      scope: tokenData.scope,
    };
  }

  /**
   * Checks if the cached token is expired or will expire within the buffer period.
   * 
   * **Validates: Requirements 12.6**
   * - 12.6: THE Backend SHALL cache SoundCloud authentication tokens and refresh them before expiration
   * 
   * @returns true if the token needs to be refreshed
   */
  isTokenExpired(): boolean {
    if (!this.cachedToken) {
      return true;
    }

    const now = new Date();
    const expirationThreshold = new Date(this.cachedToken.expiresAt.getTime() - TOKEN_REFRESH_BUFFER_MS);
    
    return now >= expirationThreshold;
  }

  /**
   * Checks if the token will expire within the specified number of minutes.
   * 
   * @param minutes - Number of minutes to check
   * @returns true if the token will expire within the specified time
   */
  willExpireWithin(minutes: number): boolean {
    if (!this.cachedToken) {
      return true;
    }

    const now = new Date();
    const threshold = new Date(this.cachedToken.expiresAt.getTime() - minutes * 60 * 1000);
    
    return now >= threshold;
  }

  /**
   * Gets the cached token if available.
   * 
   * @returns The cached token or null if not available
   */
  getCachedToken(): CachedToken | null {
    return this.cachedToken;
  }

  /**
   * Gets a valid access token, refreshing if necessary.
   * This is the main method to use when making API calls.
   * 
   * **Validates: Requirements 12.6**
   * - 12.6: THE Backend SHALL cache SoundCloud authentication tokens and refresh them before expiration
   * 
   * @returns A valid access token
   * @throws Error if unable to obtain a valid token
   */
  async getValidAccessToken(): Promise<string> {
    // If no cached token, authenticate
    if (!this.cachedToken) {
      const tokenData = await this.authenticate();
      return tokenData.access_token;
    }

    // If token is expired or will expire soon, refresh it
    if (this.isTokenExpired()) {
      try {
        const tokenData = await this.refreshAccessToken(this.cachedToken.refreshToken);
        return tokenData.access_token;
      } catch (error) {
        // If refresh fails, try full re-authentication
        const tokenData = await this.authenticate();
        return tokenData.access_token;
      }
    }

    // Return cached token
    return this.cachedToken.accessToken;
  }

  /**
   * Searches for tracks on SoundCloud with the playable filter.
   * 
   * **Validates: Requirements 4.1, 12.2, 12.3, 14.3**
   * - 4.1: WHEN a Player searches for a song, THE Backend SHALL query the SoundCloud_API with the search term and return results
   * - 12.2: WHEN a search request is made, THE Backend SHALL query the SoundCloud_API /tracks endpoint with the search query and access=playable filter
   * - 12.3: WHEN search results are returned, THE Backend SHALL extract and return track_id, title, artist, artwork_url, duration, and permalink
   * - 14.3: WHEN the SoundCloud_API is unavailable, THE Backend SHALL return an error with the message "Music service unavailable"
   * 
   * @param query - The search query string
   * @param limit - Maximum number of results to return (default: 20, max: 50)
   * @returns Array of SoundCloudTrack objects
   * @throws Error with code MUSIC_SERVICE_UNAVAILABLE if SoundCloud API is unavailable
   * @throws Error with code SOUNDCLOUD_API_ERROR for other API errors
   */
  async searchTracks(query: string, limit: number = 20): Promise<SoundCloudTrack[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Ensure limit is within bounds
    const effectiveLimit = Math.min(Math.max(1, limit), 50);

    try {
      // Get a valid access token (will refresh if needed)
      const accessToken = await this.getValidAccessToken();

      // Build the search URL with access=playable filter
      const searchParams = new URLSearchParams({
        q: query.trim(),
        access: 'playable',
        limit: effectiveLimit.toString(),
      });

      const response = await fetch(
        `${SOUNDCLOUD_API_BASE}/tracks?${searchParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `OAuth ${accessToken}`,
            'Accept': 'application/json',
          },
        }
      );

      // Handle different error responses
      if (!response.ok) {
        await this.handleSearchError(response);
      }

      const apiTracks: SoundCloudApiTrack[] = await response.json();

      // Transform API response to our SoundCloudTrack interface
      return this.transformTracks(apiTracks);
    } catch (error: unknown) {
      // Re-throw if already an AppError
      if (error instanceof AppError) {
        throw error;
      }

      // Handle network errors as service unavailable
      throw new AppError(
        ServerErrorCode.MUSIC_SERVICE_UNAVAILABLE,
        'Music service unavailable'
      );
    }
  }

  /**
   * Handles error responses from SoundCloud authentication endpoints.
   * 
   * **Validates: Requirements 14.3**
   * - 14.3: WHEN the SoundCloud_API is unavailable, THE Backend SHALL return an error with the message "Music service unavailable"
   * 
   * @param response - The fetch Response object
   * @throws AppError with appropriate code based on response status
   */
  private async handleAuthError(response: Response): Promise<never> {
    const status = response.status;

    // 5xx errors indicate service unavailable
    if (status >= 500) {
      throw new AppError(
        ServerErrorCode.MUSIC_SERVICE_UNAVAILABLE,
        'Music service unavailable'
      );
    }

    // 429 indicates rate limiting
    if (status === 429) {
      throw new AppError(
        ServerErrorCode.SOUNDCLOUD_API_ERROR,
        'Rate limit exceeded, please try again later'
      );
    }

    // All other errors are auth failures
    const errorText = await response.text();
    throw new AppError(
      ServerErrorCode.SOUNDCLOUD_AUTH_FAILED,
      `SoundCloud authentication failed: ${status} ${errorText}`
    );
  }

  /**
   * Handles error responses from the SoundCloud search API.
   * 
   * **Validates: Requirements 14.3**
   * - 14.3: WHEN the SoundCloud_API is unavailable, THE Backend SHALL return an error with the message "Music service unavailable"
   * 
   * @param response - The fetch Response object
   * @throws AppError with appropriate code based on response status
   */
  private async handleSearchError(response: Response): Promise<never> {
    const status = response.status;

    // 401 indicates auth failure - try to re-authenticate
    if (status === 401) {
      // Clear cache to force re-authentication on next request
      this.clearCache();
      throw new AppError(
        ServerErrorCode.SOUNDCLOUD_AUTH_FAILED,
        'Authentication failed, please retry'
      );
    }

    // 429 indicates rate limiting
    if (status === 429) {
      throw new AppError(
        ServerErrorCode.SOUNDCLOUD_API_ERROR,
        'Rate limit exceeded, please try again later'
      );
    }

    // 5xx errors indicate service unavailable
    if (status >= 500) {
      throw new AppError(
        ServerErrorCode.MUSIC_SERVICE_UNAVAILABLE,
        'Music service unavailable'
      );
    }

    // Other client errors
    const errorText = await response.text();
    throw new AppError(
      ServerErrorCode.SOUNDCLOUD_API_ERROR,
      `Failed to communicate with music service: ${status} ${errorText}`
    );
  }

  /**
   * Transforms raw SoundCloud API track responses to our SoundCloudTrack interface.
   * 
   * **Validates: Requirements 12.3**
   * - 12.3: WHEN search results are returned, THE Backend SHALL extract and return track_id, title, artist, artwork_url, duration, and permalink
   * 
   * @param apiTracks - Array of raw API track responses
   * @returns Array of transformed SoundCloudTrack objects
   */
  private transformTracks(apiTracks: SoundCloudApiTrack[]): SoundCloudTrack[] {
    return apiTracks.map((track) => ({
      id: track.id,
      title: track.title,
      description: track.description || '',
      duration: track.duration,
      genre: track.genre || '',
      user: {
        id: track.user.id,
        username: track.user.username,
        avatar_url: track.user.avatar_url || '',
      },
      artwork_url: track.artwork_url,
      waveform_url: track.waveform_url,
      stream_url: track.stream_url || '',
      permalink_url: track.permalink_url,
      playback_count: track.playback_count,
      likes_count: track.likes_count,
      access: track.access,
      streamable: track.streamable,
    }));
  }

  /**
   * Clears the cached token. Useful for testing or forcing re-authentication.
   */
  clearCache(): void {
    this.cachedToken = null;
  }

  /**
   * Gets the token expiration time.
   * 
   * @returns The expiration date or null if no token is cached
   */
  getTokenExpiration(): Date | null {
    return this.cachedToken?.expiresAt ?? null;
  }

  /**
   * Gets the time remaining until token expiration in milliseconds.
   * 
   * @returns Time remaining in milliseconds, or 0 if expired/no token
   */
  getTimeUntilExpiration(): number {
    if (!this.cachedToken) {
      return 0;
    }

    const now = Date.now();
    const expiresAt = this.cachedToken.expiresAt.getTime();
    
    return Math.max(0, expiresAt - now);
  }

  /**
   * Handles any SoundCloud API error and throws the appropriate AppError.
   * This is a public method that can be used by other services to handle
   * SoundCloud-related errors consistently.
   * 
   * **Validates: Requirements 14.3**
   * - 14.3: WHEN the SoundCloud_API is unavailable, THE Backend SHALL return an error with the message "Music service unavailable"
   * 
   * @param error - The error to handle (can be any error type)
   * @throws AppError with appropriate code based on error type
   */
  async handleSoundCloudError(error: unknown): Promise<never> {
    // If already an AppError, re-throw it
    if (error instanceof AppError) {
      throw error;
    }

    // Check if it's a response-like object with status
    if (error && typeof error === 'object' && 'response' in error) {
      const responseError = error as { response?: { status?: number } };
      const status = responseError.response?.status;

      if (status === 401) {
        // Token expired, refresh and retry
        await this.refreshSoundCloudToken();
        throw new AppError(
          ServerErrorCode.SOUNDCLOUD_AUTH_FAILED,
          'Authentication failed, please retry'
        );
      }

      if (status === 429) {
        // Rate limited
        throw new AppError(
          ServerErrorCode.SOUNDCLOUD_API_ERROR,
          'Rate limit exceeded, please try again later'
        );
      }

      if (status && status >= 500) {
        // SoundCloud server error
        throw new AppError(
          ServerErrorCode.MUSIC_SERVICE_UNAVAILABLE,
          'Music service unavailable'
        );
      }
    }

    // Unknown error - treat as API error
    throw new AppError(
      ServerErrorCode.SOUNDCLOUD_API_ERROR,
      'Failed to communicate with music service'
    );
  }

  /**
   * Attempts to refresh the SoundCloud token.
   * Used internally by handleSoundCloudError when a 401 is encountered.
   * 
   * @throws AppError if refresh fails
   */
  private async refreshSoundCloudToken(): Promise<void> {
    if (this.cachedToken?.refreshToken) {
      try {
        await this.refreshAccessToken(this.cachedToken.refreshToken);
      } catch {
        // If refresh fails, try full re-authentication
        await this.authenticate();
      }
    } else {
      await this.authenticate();
    }
  }

  /**
   * Initializes the service by authenticating with SoundCloud.
   * Should be called when the backend starts.
   * 
   * **Validates: Requirements 12.1**
   * - 12.1: WHEN the Backend initializes, THE Backend SHALL authenticate with the SoundCloud_API using Client Credentials OAuth flow
   * 
   * @returns true if initialization was successful
   * @throws Error if authentication fails
   */
  async initialize(): Promise<boolean> {
    if (!this.hasCredentials()) {
      console.warn('SoundCloud credentials not configured. SoundCloud features will be unavailable.');
      return false;
    }

    try {
      await this.authenticate();
      console.log('SoundCloud authentication successful');
      return true;
    } catch (error) {
      console.error('SoundCloud authentication failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const soundcloudService = new SoundCloudService();
