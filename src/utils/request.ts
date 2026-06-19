import {
  ApiError,
  AuthenticationError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from '../errors.js';
import { ClientOptions } from '../types.js';

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  skipAuth?: boolean;
}

/**
 * Internal HTTP Client wrapper that abstracts fetch operations,
 * headers setup, timeout controls, retry mechanisms, and error handling.
 */
export class RequestClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(options: ClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl?.replace(/\/$/, '') || 'https://api.secrettly.space/v1';
    this.timeout = options.timeout ?? 10000;
    this.retries = options.retries ?? 3;
  }

  /**
   * Helper to construct headers dynamically.
   * Filters out restricted headers in browser environments.
   */
  private getHeaders(skipAuth = false): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!skipAuth) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    // User-Agent is blocked by browsers, so only set in non-browser environments
    if (typeof window === 'undefined' && typeof process !== 'undefined') {
      headers['User-Agent'] = 'secrettly-sdk-js/1.0.0';
    }

    return headers;
  }

  /**
   * Performs an asynchronous delay (sleep).
   */
  private delay(attempt: number): Promise<void> {
    const initialDelay = 150;
    const backoff = initialDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 50;
    return new Promise((resolve) => setTimeout(resolve, backoff + jitter));
  }

  /**
   * Performs the HTTP request with retry logic and error mapping.
   */
  async request<T>(options: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${options.path}`;
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          method: options.method,
          headers: this.getHeaders(options.skipAuth),
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const text = await response.text();
          if (!text) {
            return {} as T;
          }
          return JSON.parse(text) as T;
        }

        // Parse API-returned error details
        const errorText = await response.text();
        let errorBody: unknown;
        try {
          errorBody = errorText ? JSON.parse(errorText) : undefined;
        } catch {
          errorBody = errorText;
        }

        const errorMessage =
          errorBody && typeof errorBody === 'object' && 'message' in errorBody
            ? String((errorBody as { message: unknown }).message)
            : `API request failed with status code ${response.status}`;

        // Retry 5xx Server Errors if retries are not exhausted
        if (response.status >= 500 && attempt < this.retries) {
          attempt++;
          await this.delay(attempt);
          continue;
        }

        // Map status codes to specific custom errors
        if (response.status === 401) {
          throw new AuthenticationError(errorMessage, errorBody);
        }
        if (response.status === 429) {
          throw new RateLimitError(errorMessage, errorBody);
        }
        if (response.status === 400 || response.status === 422) {
          throw new ValidationError(errorMessage, errorBody);
        }

        throw new ApiError(errorMessage, response.status, errorBody);
      } catch (error: any) {
        clearTimeout(timeoutId);

        // Handle request timeout (abort signal triggered)
        if (error.name === 'AbortError') {
          const timeoutMessage = `Request timed out after ${this.timeout}ms`;
          if (attempt < this.retries) {
            attempt++;
            await this.delay(attempt);
            continue;
          }
          throw new NetworkError(timeoutMessage, error);
        }

        // Handle standard fetch exceptions (like TypeError for network failures)
        if (error instanceof TypeError) {
          if (attempt < this.retries) {
            attempt++;
            await this.delay(attempt);
            continue;
          }
          throw new NetworkError(`Network connection failed: ${error.message}`, error);
        }

        // Propagate custom SecrettlyError types directly
        throw error;
      }
    }
  }
}
