import { RequestClient } from '../utils/request.js';
import { ListEventsResponse } from '../types.js';

/**
 * Resource class for interacting with the Secrettly Events (Audit Logs) API.
 */
export class Events {
  private readonly client: RequestClient;

  constructor(client: RequestClient) {
    this.client = client;
  }

  /**
   * Retrieves a paginated list of audit events/logs for the organization.
   *
   * @param options Query parameters for pagination.
   * @param options.page Page number to retrieve (default: 1).
   * @param options.limit Number of items per page (default: 20, max: 100).
   * @returns A promise resolving to the list of audit events and pagination metadata.
   * @throws {SecrettlyError} If the API request fails.
   * 
   * @example
   * ```ts
   * const events = await client.events.list({ page: 1, limit: 10 });
   * for (const event of events.data) {
   *   console.log(`[${event.createdAt}] Event: ${event.type} by ${event.userId}`);
   * }
   * ```
   */
  async list(options?: { page?: number; limit?: number }): Promise<ListEventsResponse> {
    const queryParams: Record<string, string> = {};

    if (options?.page !== undefined) {
      queryParams['page'] = options.page.toString();
    }
    if (options?.limit !== undefined) {
      queryParams['limit'] = options.limit.toString();
    }

    const queryString = new URLSearchParams(queryParams).toString();
    const path = queryString ? `/events?${queryString}` : '/events';

    return this.client.request<ListEventsResponse>({
      method: 'GET',
      path,
    });
  }
}
