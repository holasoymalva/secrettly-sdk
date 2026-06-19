import { RequestClient } from '../utils/request.js';
import {
  WebhookRegistrationRequest,
  WebhookRegistrationResponse,
} from '../types.js';

/**
 * Computes an HMAC-SHA256 hash using the Web Crypto API,
 * with fallbacks for older Node environments.
 */
async function computeHmacSha256(secret: string, text: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(text);

  let cryptoInstance: any =
    typeof globalThis !== 'undefined' && globalThis.crypto ? globalThis.crypto : null;

  if (!cryptoInstance || !cryptoInstance.subtle) {
    try {
      const nodeCrypto = await import('crypto');
      cryptoInstance = nodeCrypto.webcrypto || nodeCrypto;
    } catch {
      throw new Error(
        'Crypto API is not available in this environment. Ensure globalThis.crypto is present.'
      );
    }
  }

  const key = await cryptoInstance.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await cryptoInstance.subtle.sign('HMAC', key, messageData);

  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Resource class for managing Secrettly webhooks and verifying webhook signatures.
 */
export class Webhooks {
  private readonly client: RequestClient;

  constructor(client: RequestClient) {
    this.client = client;
  }

  /**
   * Registers a new webhook listener endpoint.
   *
   * @param request The webhook registration details (url, events).
   * @returns A promise resolving to the webhook registration response.
   * @throws {SecrettlyError} If the API request fails.
   * 
   * @example
   * ```ts
   * const webhook = await client.webhooks.register({
   *   url: "https://yourdomain.com/secrettly-webhooks",
   *   events: ["secret.created", "secret.opened"]
   * });
   * console.log(`Signing Secret: ${webhook.secret}`);
   * ```
   */
  async register(request: WebhookRegistrationRequest): Promise<WebhookRegistrationResponse> {
    return this.client.request<WebhookRegistrationResponse>({
      method: 'POST',
      path: '/webhooks',
      body: request,
    });
  }

  /**
   * Verifies the authenticity of a webhook request payload using the HMAC-SHA256 signature
   * header and the webhook signing secret.
   *
   * @param payload The raw string body of the incoming webhook request.
   * @param header The value of the `Secrettly-Signature` header.
   * @param secret The webhook signing secret.
   * @param tolerance Time tolerance in seconds to prevent replay attacks (default: 300 seconds / 5 minutes). Use 0 to disable.
   * @returns A promise resolving to `true` if the signature is valid, or `false` otherwise.
   * 
   * @example
   * ```ts
   * const isValid = await Webhooks.verifySignature(
   *   rawBodyText,
   *   req.headers["secrettly-signature"] as string,
   *   webhookSigningSecret
   * );
   * 
   * if (isValid) {
   *   // Process event
   * }
   * ```
   */
  static async verifySignature(
    payload: string,
    header: string,
    secret: string,
    tolerance = 300
  ): Promise<boolean> {
    if (!payload || !header || !secret) {
      return false;
    }

    // Parse the header (e.g. t=1718818818,v1=f6c91a0b3c2d4e5f6a7b...)
    const parts = header.split(',');
    let timestampStr = '';
    let signature = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (!key || !value) continue;
      if (key.trim() === 't') timestampStr = value.trim();
      if (key.trim() === 'v1') signature = value.trim();
    }

    if (!timestampStr || !signature) {
      return false;
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) {
      return false;
    }

    // Replay attack check
    if (tolerance > 0) {
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - timestamp) > tolerance) {
        return false;
      }
    }

    // signature_payload = timestamp + '.' + raw_body
    const signaturePayload = `${timestamp}.${payload}`;

    try {
      const computed = await computeHmacSha256(secret, signaturePayload);
      return computed === signature;
    } catch {
      return false;
    }
  }
}
