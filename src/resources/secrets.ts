import { RequestClient } from '../utils/request.js';
import {
  validateCreateSecretRequest,
  validateId,
} from '../utils/validation.js';
import {
  CreateSecretRequest,
  RevokeSecretResponse,
  Secret,
  SecretMetadata,
} from '../types.js';

/**
 * Resource class for interacting with the Secrettly Secrets API endpoints.
 */
export class Secrets {
  private readonly client: RequestClient;

  constructor(client: RequestClient) {
    this.client = client;
  }

  /**
   * Creates a new ephemeral, encrypted secret.
   *
   * @param request Options for creating the secret.
   * @returns A promise resolving to the created secret link details.
   * @throws {ValidationError} If client-side validation fails.
   * @throws {SecrettlyError} If the API request fails.
   * 
   * @example
   * ```ts
   * const secret = await client.secrets.create({
   *   content: "DATABASE_URL=postgresql://...",
   *   expiresIn: "1h",
   *   maxViews: 1
   * });
   * console.log(secret.url); // https://secrettly.space/s/abc123
   * ```
   */
  async create(request: CreateSecretRequest): Promise<Secret> {
    validateCreateSecretRequest(request);

    return this.client.request<Secret>({
      method: 'POST',
      path: '/secrets',
      body: request,
    });
  }

  /**
   * Retrieves the metadata of a secret by its ID.
   * Note: This does not retrieve the secret content itself to preserve its ephemeral nature.
   *
   * @param id The unique identifier of the secret (e.g., "sec_123").
   * @returns A promise resolving to the secret's metadata.
   * @throws {ValidationError} If the secret ID is invalid.
   * @throws {SecrettlyError} If the secret is not found or the API request fails.
   * 
   * @example
   * ```ts
   * const metadata = await client.secrets.get("sec_123");
   * console.log(metadata.status); // "active"
   * console.log(metadata.views);  // 0
   * ```
   */
  async get(id: string): Promise<SecretMetadata> {
    validateId(id, 'secret');

    return this.client.request<SecretMetadata>({
      method: 'GET',
      path: `/secrets/${id}`,
    });
  }

  /**
   * Revokes an active secret by its ID, making the ephemeral link immediately invalid.
   *
   * @param id The unique identifier of the secret to revoke.
   * @returns A promise resolving to the revocation confirmation.
   * @throws {ValidationError} If the secret ID is invalid.
   * @throws {SecrettlyError} If the API request fails.
   * 
   * @example
   * ```ts
   * const result = await client.secrets.revoke("sec_123");
   * if (result.success) {
   *   console.log("Secret revoked successfully.");
   * }
   * ```
   */
  async revoke(id: string): Promise<RevokeSecretResponse> {
    validateId(id, 'secret');

    return this.client.request<RevokeSecretResponse>({
      method: 'POST',
      path: `/secrets/${id}/revoke`,
    });
  }

  /**
   * Retrieves a list of all secrets associated with the account.
   *
   * @returns A promise resolving to an array of secret metadata.
   * @throws {SecrettlyError} If the API request fails.
   * 
   * @example
   * ```ts
   * const secrets = await client.secrets.list();
   * for (const secret of secrets) {
   *   console.log(`${secret.id} status: ${secret.status}`);
   * }
   * ```
   */
  async list(): Promise<SecretMetadata[]> {
    const response = await this.client.request<SecretMetadata[] | { data: SecretMetadata[] }>({
      method: 'GET',
      path: '/secrets',
    });

    if (Array.isArray(response)) {
      return response;
    }

    if (
      response &&
      typeof response === 'object' &&
      'data' in response &&
      Array.isArray(response.data)
    ) {
      return response.data;
    }

    return [];
  }
}
