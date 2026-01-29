/**
 * Error types for Nero Party application.
 * 
 * **Validates: Requirements 14.5**
 * - Defines consistent error codes for client and server errors
 * - Provides structured error response format
 * - Includes field-specific validation error support
 */

/**
 * Client error codes (4xx errors).
 * These represent errors caused by invalid client requests.
 */
export enum ClientErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_HOST = 'NOT_HOST',
  NOT_SUBMITTER = 'NOT_SUBMITTER',
  
  // Validation
  INVALID_PARTY_CODE = 'INVALID_PARTY_CODE',
  INVALID_SETTINGS = 'INVALID_SETTINGS',
  INVALID_CONFIDENCE = 'INVALID_CONFIDENCE',
  INVALID_VOTE_RATING = 'INVALID_VOTE_RATING',
  
  // Business Logic - Not Found
  PARTY_NOT_FOUND = 'PARTY_NOT_FOUND',
  PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND',
  SONG_NOT_FOUND = 'SONG_NOT_FOUND',
  VOTE_NOT_FOUND = 'VOTE_NOT_FOUND',
  TARGET_NOT_FOUND = 'TARGET_NOT_FOUND',
  THEME_NOT_FOUND = 'THEME_NOT_FOUND',
  ROUND_NOT_FOUND = 'ROUND_NOT_FOUND',
  INVALID_ACHIEVEMENT = 'INVALID_ACHIEVEMENT',
  
  // Business Logic - State/Limit Errors
  PARTY_FULL = 'PARTY_FULL',
  PARTY_STARTED = 'PARTY_STARTED',
  SONG_LIMIT_REACHED = 'SONG_LIMIT_REACHED',
  DUPLICATE_SONG = 'DUPLICATE_SONG',
  CANNOT_VOTE_OWN_SONG = 'CANNOT_VOTE_OWN_SONG',
  VOTE_LOCKED = 'VOTE_LOCKED',
  INVALID_STATE = 'INVALID_STATE',
  PLAYER_NOT_IN_PARTY = 'PLAYER_NOT_IN_PARTY',
  SUBMISSIONS_INCOMPLETE = 'SUBMISSIONS_INCOMPLETE',
  CANNOT_KICK_SELF = 'CANNOT_KICK_SELF',
  INVALID_CONSTRAINTS = 'INVALID_CONSTRAINTS',
  INVALID_ADHERENCE_RATING = 'INVALID_ADHERENCE_RATING',
  INSUFFICIENT_POINTS = 'INSUFFICIENT_POINTS',
}

/**
 * Server error codes (5xx errors).
 * These represent errors caused by server-side issues.
 */
export enum ServerErrorCode {
  // External Services
  SOUNDCLOUD_API_ERROR = 'SOUNDCLOUD_API_ERROR',
  SOUNDCLOUD_AUTH_FAILED = 'SOUNDCLOUD_AUTH_FAILED',
  MUSIC_SERVICE_UNAVAILABLE = 'MUSIC_SERVICE_UNAVAILABLE',
  
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Internal
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

/**
 * Combined error code type for convenience.
 */
export type ErrorCode = ClientErrorCode | ServerErrorCode;

/**
 * Error response structure for API responses.
 * All errors follow this consistent format.
 * 
 * **Validates: Requirements 14.5**
 * - code: Identifies the specific error type
 * - message: Human-readable error description
 * - field: For validation errors, identifies which field failed
 * - details: Additional context for debugging
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    field?: string;  // For validation errors
    details?: unknown;   // Additional context
  };
  timestamp: string;
  requestId: string;
}

/**
 * HTTP status codes mapped to error types.
 */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  // Client errors (4xx)
  [ClientErrorCode.UNAUTHORIZED]: 401,
  [ClientErrorCode.NOT_HOST]: 403,
  [ClientErrorCode.NOT_SUBMITTER]: 403,
  [ClientErrorCode.INVALID_PARTY_CODE]: 400,
  [ClientErrorCode.INVALID_SETTINGS]: 400,
  [ClientErrorCode.INVALID_CONFIDENCE]: 400,
  [ClientErrorCode.INVALID_VOTE_RATING]: 400,
  [ClientErrorCode.PARTY_NOT_FOUND]: 404,
  [ClientErrorCode.PLAYER_NOT_FOUND]: 404,
  [ClientErrorCode.SONG_NOT_FOUND]: 404,
  [ClientErrorCode.VOTE_NOT_FOUND]: 404,
  [ClientErrorCode.TARGET_NOT_FOUND]: 404,
  [ClientErrorCode.THEME_NOT_FOUND]: 404,
  [ClientErrorCode.ROUND_NOT_FOUND]: 404,
  [ClientErrorCode.INVALID_ACHIEVEMENT]: 404,
  [ClientErrorCode.PARTY_FULL]: 400,
  [ClientErrorCode.PARTY_STARTED]: 400,
  [ClientErrorCode.SONG_LIMIT_REACHED]: 400,
  [ClientErrorCode.DUPLICATE_SONG]: 400,
  [ClientErrorCode.CANNOT_VOTE_OWN_SONG]: 400,
  [ClientErrorCode.VOTE_LOCKED]: 400,
  [ClientErrorCode.INVALID_STATE]: 400,
  [ClientErrorCode.PLAYER_NOT_IN_PARTY]: 400,
  [ClientErrorCode.SUBMISSIONS_INCOMPLETE]: 400,
  [ClientErrorCode.CANNOT_KICK_SELF]: 400,
  [ClientErrorCode.INVALID_CONSTRAINTS]: 400,
  [ClientErrorCode.INVALID_ADHERENCE_RATING]: 400,
  [ClientErrorCode.INSUFFICIENT_POINTS]: 400,
  
  // Server errors (5xx)
  [ServerErrorCode.SOUNDCLOUD_API_ERROR]: 502,
  [ServerErrorCode.SOUNDCLOUD_AUTH_FAILED]: 502,
  [ServerErrorCode.MUSIC_SERVICE_UNAVAILABLE]: 503,
  [ServerErrorCode.DATABASE_ERROR]: 500,
  [ServerErrorCode.INTERNAL_SERVER_ERROR]: 500,
};

/**
 * Default error messages for each error code.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Client errors
  [ClientErrorCode.UNAUTHORIZED]: 'Authentication required',
  [ClientErrorCode.NOT_HOST]: 'Only the host can perform this action',
  [ClientErrorCode.NOT_SUBMITTER]: 'Only the submitter can perform this action',
  [ClientErrorCode.INVALID_PARTY_CODE]: 'Invalid party code format',
  [ClientErrorCode.INVALID_SETTINGS]: 'Invalid settings value',
  [ClientErrorCode.INVALID_CONFIDENCE]: 'Confidence level must be between 1 and 5',
  [ClientErrorCode.INVALID_VOTE_RATING]: 'Vote rating must be between 1 and 10',
  [ClientErrorCode.PARTY_NOT_FOUND]: 'Party not found',
  [ClientErrorCode.PLAYER_NOT_FOUND]: 'Player not found',
  [ClientErrorCode.SONG_NOT_FOUND]: 'Song not found',
  [ClientErrorCode.VOTE_NOT_FOUND]: 'Vote not found',
  [ClientErrorCode.TARGET_NOT_FOUND]: 'Target player not found',
  [ClientErrorCode.THEME_NOT_FOUND]: 'Theme not found',
  [ClientErrorCode.ROUND_NOT_FOUND]: 'Round not found',
  [ClientErrorCode.INVALID_ACHIEVEMENT]: 'Achievement not found',
  [ClientErrorCode.PARTY_FULL]: 'Party is full',
  [ClientErrorCode.PARTY_STARTED]: 'Cannot join a party that has already started',
  [ClientErrorCode.SONG_LIMIT_REACHED]: 'Song limit reached',
  [ClientErrorCode.DUPLICATE_SONG]: 'This song has already been submitted',
  [ClientErrorCode.CANNOT_VOTE_OWN_SONG]: 'Cannot vote on your own song',
  [ClientErrorCode.VOTE_LOCKED]: 'Vote has already been locked',
  [ClientErrorCode.INVALID_STATE]: 'Invalid party state for this action',
  [ClientErrorCode.PLAYER_NOT_IN_PARTY]: 'Player does not belong to this party',
  [ClientErrorCode.SUBMISSIONS_INCOMPLETE]: 'Not all players have submitted their required songs',
  [ClientErrorCode.CANNOT_KICK_SELF]: 'Cannot kick yourself',
  [ClientErrorCode.INVALID_CONSTRAINTS]: 'Invalid theme constraints',
  [ClientErrorCode.INVALID_ADHERENCE_RATING]: 'Theme adherence rating must be between 1 and 5',
  [ClientErrorCode.INSUFFICIENT_POINTS]: 'Insufficient power-up points',
  
  // Server errors
  [ServerErrorCode.SOUNDCLOUD_API_ERROR]: 'SoundCloud API error',
  [ServerErrorCode.SOUNDCLOUD_AUTH_FAILED]: 'SoundCloud authentication failed',
  [ServerErrorCode.MUSIC_SERVICE_UNAVAILABLE]: 'Music service unavailable',
  [ServerErrorCode.DATABASE_ERROR]: 'Database error',
  [ServerErrorCode.INTERNAL_SERVER_ERROR]: 'Internal server error',
};

/**
 * Application error class for throwing typed errors.
 * Extends the built-in Error class with additional properties
 * for structured error handling.
 * 
 * **Validates: Requirements 14.5**
 * 
 * @example
 * // Throw a validation error with field information
 * throw new AppError(ClientErrorCode.INVALID_SETTINGS, 'Must be 1, 2, or 3', 'songsPerPlayer');
 * 
 * @example
 * // Throw a business logic error
 * throw new AppError(ClientErrorCode.PARTY_NOT_FOUND);
 * 
 * @example
 * // Throw a server error with details
 * throw new AppError(ServerErrorCode.DATABASE_ERROR, 'Connection failed', undefined, { host: 'localhost' });
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;
  public readonly field?: string;
  public readonly details?: unknown;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message?: string,
    field?: string,
    details?: unknown
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = ERROR_HTTP_STATUS[code];
    this.field = field;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Converts the error to an ErrorResponse format.
   * 
   * @param requestId - The request ID to include in the response
   * @returns ErrorResponse object suitable for API responses
   */
  toResponse(requestId: string): ErrorResponse {
    const errorObj: ErrorResponse['error'] = {
      code: this.code,
      message: this.message,
    };

    if (this.field !== undefined) {
      errorObj.field = this.field;
    }

    if (this.details !== undefined) {
      errorObj.details = this.details;
    }

    return {
      error: errorObj,
      timestamp: this.timestamp,
      requestId,
    };
  }

  /**
   * Checks if the error is a client error (4xx).
   */
  isClientError(): boolean {
    return this.httpStatus >= 400 && this.httpStatus < 500;
  }

  /**
   * Checks if the error is a server error (5xx).
   */
  isServerError(): boolean {
    return this.httpStatus >= 500;
  }
}

/**
 * Type guard to check if an error is an AppError.
 * 
 * @param error - The error to check
 * @returns True if the error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Creates an ErrorResponse from any error.
 * Useful for error handling middleware.
 * 
 * @param error - The error to convert
 * @param requestId - The request ID to include
 * @returns ErrorResponse object
 */
export function createErrorResponse(error: unknown, requestId: string): ErrorResponse {
  if (isAppError(error)) {
    return error.toResponse(requestId);
  }

  // Handle unknown errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  return {
    error: {
      code: ServerErrorCode.INTERNAL_SERVER_ERROR,
      message,
    },
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * Gets the HTTP status code for an error.
 * 
 * @param error - The error to get the status for
 * @returns HTTP status code
 */
export function getErrorHttpStatus(error: unknown): number {
  if (isAppError(error)) {
    return error.httpStatus;
  }
  return 500;
}
