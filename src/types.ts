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
   * Supported units: m (minutes), h (hours), d (days).
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
export type SecretStatus = 'active' | 'revoked' | 'expired' | 'view_limit_reached' | 'CONSUMED' | 'REVOKED';

/**
 * Represents the metadata of a secret.
 */
export interface SecretMetadata {
  /**
   * Unique identifier of the secret.
   */
  id: string;

  /**
   * ID of the organization that owns this secret.
   */
  organizationId?: string;

  /**
   * ID of the user who created this secret.
   */
  userId?: string;

  /**
   * The reveal token used to fetch the secret plaintext.
   */
  revealToken?: string;

  /**
   * ISO 8601 timestamp when the secret was created.
   */
  createdAt: string;

  /**
   * ISO 8601 timestamp when the secret was last updated.
   */
  updatedAt?: string;

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

  /**
   * The ID of the revoked secret.
   */
  id: string;

  /**
   * The status of the secret (should be "REVOKED").
   */
  status: string;

  /**
   * ISO 8601 timestamp when the secret was updated.
   */
  updatedAt: string;
}

/**
 * Response for revealing/decrypting a secret.
 */
export interface RevealSecretResponse {
  /**
   * The decrypted plaintext content of the secret.
   */
  content: string;
}

/**
 * Represents an audit log event.
 */
export interface EventLog {
  /**
   * Unique identifier of the event.
   */
  id: string;

  /**
   * Type of event (e.g. 'secret.created', 'secret.opened', 'secret.revoked', 'secret.expired').
   */
  type: string;

  /**
   * ID of the organization where this event occurred.
   */
  organizationId: string;

  /**
   * ID of the user who triggered the event.
   */
  userId: string;

  /**
   * Event-specific metadata context payload.
   */
  metadata?: unknown;

  /**
   * ISO 8601 timestamp when the event was recorded.
   */
  createdAt: string;
}

/**
 * Paginated response for listing events.
 */
export interface ListEventsResponse {
  /**
   * Array of event logs.
   */
  data: EventLog[];

  /**
   * Current page number.
   */
  page: number;

  /**
   * Limit of items per page.
   */
  limit: number;

  /**
   * Total number of events matching the query.
   */
  total?: number;
}

/**
 * Body parameter for registering a webhook listener.
 */
export interface WebhookRegistrationRequest {
  /**
   * The destination URL where webhook HTTP POST payloads will be sent.
   */
  url: string;

  /**
   * Array of event types to subscribe to (e.g. ["secret.created", "secret.opened"]).
   */
  events: string[];
}

/**
 * Response returned after registering a webhook.
 */
export interface WebhookRegistrationResponse {
  /**
   * Unique identifier of the registered webhook endpoint.
   */
  id: string;

  /**
   * The registered endpoint destination URL.
   */
  url: string;

  /**
   * The signing secret used to verify Secrettly-Signature headers.
   */
  secret: string;

  /**
   * List of subscribed event types.
   */
  events: string[];

  /**
   * Indicates if the webhook is currently active.
   */
  isActive: boolean;
}
