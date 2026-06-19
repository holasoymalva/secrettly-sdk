import { Secrets } from './resources/secrets.js';
import { Events } from './resources/events.js';
import { Webhooks } from './resources/webhooks.js';
import { ClientOptions } from './types.js';
import { RequestClient } from './utils/request.js';
import { validateClientOptions } from './utils/validation.js';

/**
 * The main client class for interacting with the Secrettly API.
 */
export class Secrettly {
  /**
   * Operations for managing ephemeral secrets.
   */
  public readonly secrets: Secrets;

  /**
   * Operations for querying audit events / logs.
   */
  public readonly events: Events;

  /**
   * Operations for registering and managing webhook subscriptions.
   */
  public readonly webhooks: Webhooks;

  /**
   * The underlying HTTP client used by the SDK.
   */
  private readonly requestClient: RequestClient;

  /**
   * Initializes a new instance of the Secrettly API client.
   *
   * @param options Configuration options for the client.
   * @throws {ValidationError} If client options validation fails.
   * 
   * @example
   * ```ts
   * import { Secrettly } from "@secrettly/sdk";
   * 
   * const client = new Secrettly({
   *   apiKey: "sk_live_xxx",
   *   timeout: 10000,
   *   retries: 3
   * });
   * ```
   */
  constructor(options: ClientOptions) {
    validateClientOptions(options);

    this.requestClient = new RequestClient(options);
    this.secrets = new Secrets(this.requestClient);
    this.events = new Events(this.requestClient);
    this.webhooks = new Webhooks(this.requestClient);
  }
}
