import { ValidationError } from '../errors.js';
import { ClientOptions, CreateSecretRequest } from '../types.js';

/**
 * Validates the options provided during client initialization.
 * 
 * @param options The initialization options.
 * @throws {ValidationError} If validation fails.
 */
export function validateClientOptions(options: ClientOptions): void {
  if (!options) {
    throw new ValidationError('Client options are required.');
  }

  const { apiKey, baseUrl, timeout, retries } = options;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new ValidationError('apiKey is required and must be a non-empty string.');
  }

  if (baseUrl !== undefined) {
    if (typeof baseUrl !== 'string' || baseUrl.trim() === '') {
      throw new ValidationError('baseUrl must be a non-empty string.');
    }
    try {
      new URL(baseUrl);
    } catch {
      throw new ValidationError('baseUrl must be a valid URL.');
    }
  }

  if (timeout !== undefined) {
    if (typeof timeout !== 'number' || isNaN(timeout) || timeout <= 0 || !Number.isInteger(timeout)) {
      throw new ValidationError('timeout must be a positive integer.');
    }
  }

  if (retries !== undefined) {
    if (typeof retries !== 'number' || isNaN(retries) || retries < 0 || !Number.isInteger(retries)) {
      throw new ValidationError('retries must be a non-negative integer.');
    }
  }
}

/**
 * Validates the parameters for creating a secret.
 * 
 * @param request The secret creation parameters.
 * @throws {ValidationError} If validation fails.
 */
export function validateCreateSecretRequest(request: CreateSecretRequest): void {
  if (!request) {
    throw new ValidationError('Create secret request body is required.');
  }

  const { content, expiresIn, maxViews } = request;

  if (content === undefined || content === null) {
    throw new ValidationError('content is required.');
  }

  if (typeof content !== 'string' || content.trim() === '') {
    throw new ValidationError('content must be a non-empty string.');
  }

  if (expiresIn !== undefined) {
    if (typeof expiresIn !== 'string' || expiresIn.trim() === '') {
      throw new ValidationError('expiresIn must be a non-empty string.');
    }
    // Basic format validation for expiresIn (e.g. "1h", "30m", "7d")
    const durationRegex = /^\d+[smhd]$/;
    if (!durationRegex.test(expiresIn)) {
      throw new ValidationError('expiresIn must be a string containing a number followed by s, m, h, or d (e.g. "1h", "30m").');
    }
  }

  if (maxViews !== undefined) {
    if (typeof maxViews !== 'number' || isNaN(maxViews) || maxViews < 1 || !Number.isInteger(maxViews)) {
      throw new ValidationError('maxViews must be an integer greater than or equal to 1.');
    }
  }
}

/**
 * Validates a resource ID (e.g., secret ID).
 * 
 * @param id The resource ID.
 * @param resourceName The name of the resource (for error messages).
 * @throws {ValidationError} If validation fails.
 */
export function validateId(id: string, resourceName: string): void {
  if (!id || typeof id !== 'string' || id.trim() === '') {
    throw new ValidationError(`${resourceName} ID is required and must be a non-empty string.`);
  }
}
