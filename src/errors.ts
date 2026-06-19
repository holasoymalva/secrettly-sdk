/**
 * Base error class for all Secrettly SDK errors.
 */
export class SecrettlyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when input validation fails, either on the client side or the server side.
 */
export class ValidationError extends SecrettlyError {
  /**
   * Optional details or response body associated with the validation failure.
   */
  public readonly body?: unknown;

  constructor(message: string, body?: unknown) {
    super(message);
    this.body = body;
  }
}

/**
 * Error thrown when a network communication issue occurs (e.g., DNS failure, CORS, offline).
 */
export class NetworkError extends SecrettlyError {
  /**
   * The original error object thrown by the runtime's fetch environment.
   */
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.originalError = originalError;
  }
}

/**
 * Base class for all errors returned by the Secrettly REST API.
 */
export class ApiError extends SecrettlyError {
  /**
   * The HTTP response status code (e.g., 400, 404, 500).
   */
  public readonly statusCode: number;

  /**
   * The raw response body returned by the API, if available.
   */
  public readonly body?: unknown;

  constructor(message: string, statusCode: number, body?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.body = body;
  }
}

/**
 * Error thrown when authentication fails (HTTP Status 401).
 */
export class AuthenticationError extends ApiError {
  constructor(message: string, body?: unknown) {
    super(message, 401, body);
  }
}

/**
 * Error thrown when requests are rate limited (HTTP Status 429).
 */
export class RateLimitError extends ApiError {
  constructor(message: string, body?: unknown) {
    super(message, 429, body);
  }
}
