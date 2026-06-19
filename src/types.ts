/**
 * Options for configuring the Secrettly client.
 */
export interface ClientOptions {
  /**
   * The API Key used to authenticate requests.
   * Typically starts with `sk_live_` or `sk_test_`.
   */
  apiKey: string;

  /**
   * The base URL of the Secrettly API.
   * Defaults to `https://api.secrettly.space/v1`.
   */
  baseUrl?: string;

  /**
   * Timeout for requests in milliseconds.
   * Defaults to `10000` (10 seconds).
   */
  timeout?: number;

  /**
   * Number of retries for failed requests.
   * Defaults to `3`.
   */
  retries?: number;
}

/**
 * Options for creating a new ephemeral secret.
 */
export interface CreateSecretRequest {
  /**
   * The raw secret content to encrypt and share.
   */
  content: string;

  /**
   * The duration after which the secret expires (e.g. "1h", "24h", "7d").
   */
  expiresIn?: string;

  /**
   * The maximum number of times the secret can be viewed before it is deleted.
   * Defaults to 1.
   */
  maxViews?: number;
}

/**
 * Represents a created secret with its ephemeral link.
 */
export interface Secret {
  /**
   * Unique identifier of the secret.
   */
  id: string;

  /**
   * The ephemeral URL where the secret can be viewed/retrieved.
   */
  url: string;

  /**
   * The exact ISO 8601 timestamp when the secret will expire.
   */
  expiresAt: string;
}

/**
 * Status of a secret.
 */
export type SecretStatus = 'active' | 'revoked' | 'expired' | 'view_limit_reached';

/**
 * Represents the metadata of a secret.
 */
export interface SecretMetadata {
  /**
   * Unique identifier of the secret.
   */
  id: string;

  /**
   * ISO 8601 timestamp when the secret was created.
   */
  createdAt: string;

  /**
   * ISO 8601 timestamp when the secret will expire.
   */
  expiresAt: string;

  /**
   * Current number of times the secret has been viewed.
   */
  views: number;

  /**
   * Maximum views allowed for the secret before it becomes invalid.
   */
  maxViews: number;

  /**
   * The current status of the secret.
   */
  status: SecretStatus;
}

/**
 * Represents the response from revoking a secret.
 */
export interface RevokeSecretResponse {
  /**
   * Indicates if the secret was successfully revoked.
   */
  success: boolean;
}
