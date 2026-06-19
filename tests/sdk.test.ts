import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Secrettly } from '../src/client.js';
import { Webhooks } from '../src/resources/webhooks.js';
import {
  ApiError,
  AuthenticationError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from '../src/errors.js';

describe('Secrettly SDK', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Client Initialization & Input Validation', () => {
    it('should initialize successfully with valid configuration', () => {
      const client = new Secrettly({ apiKey: 'sk_live_123' });
      expect(client).toBeDefined();
      expect(client.secrets).toBeDefined();
    });

    it('should throw ValidationError if apiKey is missing or empty', () => {
      expect(() => new Secrettly({ apiKey: '' })).toThrow(ValidationError);
      expect(() => new Secrettly({ apiKey: '   ' })).toThrow(ValidationError);
      expect(() => new Secrettly(null as any)).toThrow(ValidationError);
    });

    it('should throw ValidationError if baseUrl is invalid', () => {
      expect(() => new Secrettly({ apiKey: 'sk_123', baseUrl: 'invalid-url' })).toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError if timeout or retries are invalid', () => {
      expect(() => new Secrettly({ apiKey: 'sk_123', timeout: -100 })).toThrow(ValidationError);
      expect(() => new Secrettly({ apiKey: 'sk_123', timeout: 1.5 })).toThrow(ValidationError);
      expect(() => new Secrettly({ apiKey: 'sk_123', retries: -1 })).toThrow(ValidationError);
      expect(() => new Secrettly({ apiKey: 'sk_123', retries: 2.3 })).toThrow(ValidationError);
    });
  });

  describe('Secrets API Validation', () => {
    const client = new Secrettly({ apiKey: 'sk_live_123' });

    it('should validate create options', async () => {
      await expect(client.secrets.create({ content: '' })).rejects.toThrow(ValidationError);
      await expect(client.secrets.create({ content: 'xyz', expiresIn: 'invalid' })).rejects.toThrow(
        ValidationError
      );
      await expect(client.secrets.create({ content: 'xyz', maxViews: 0 })).rejects.toThrow(
        ValidationError
      );
      await expect(client.secrets.create({ content: 'xyz', maxViews: -5 })).rejects.toThrow(
        ValidationError
      );
    });

    it('should validate ID on get and revoke', async () => {
      await expect(client.secrets.get('')).rejects.toThrow(ValidationError);
      await expect(client.secrets.revoke('')).rejects.toThrow(ValidationError);
    });
  });

  describe('Successful Requests', () => {
    it('should create a secret successfully', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123' });
      const mockResponse = {
        id: 'sec_123',
        url: 'https://secrettly.space/s/abc123',
        expiresAt: '2026-01-01T00:00:00Z',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const secret = await client.secrets.create({
        content: 'my_secret_token',
        expiresIn: '24h',
        maxViews: 5,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(secret).toEqual(mockResponse);

      const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
      expect(calledUrl).toBe('https://api.secrettly.space/v1/secrets');
      expect(calledInit?.method).toBe('POST');
      expect(JSON.parse(calledInit?.body as string)).toEqual({
        content: 'my_secret_token',
        expiresIn: '24h',
        maxViews: 5,
      });
    });

    it('should retrieve a secret metadata successfully', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123' });
      const mockMetadata = {
        id: 'sec_123',
        createdAt: '2026-06-19T00:00:00Z',
        expiresAt: '2026-06-20T00:00:00Z',
        views: 0,
        maxViews: 1,
        status: 'active',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockMetadata),
      } as Response);

      const metadata = await client.secrets.get('sec_123');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(metadata).toEqual(mockMetadata);
      expect(fetchSpy.mock.calls[0][0]).toBe('https://api.secrettly.space/v1/secrets/sec_123');
    });

    it('should revoke a secret successfully using DELETE', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123' });
      const mockResponse = {
        id: 'sec_123',
        status: 'REVOKED',
        updatedAt: '2026-06-19T19:45:00.000Z',
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const result = await client.secrets.revoke('sec_123');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        id: 'sec_123',
        status: 'REVOKED',
        updatedAt: '2026-06-19T19:45:00.000Z',
      });
      const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
      expect(calledUrl).toBe('https://api.secrettly.space/v1/secrets/sec_123');
      expect(calledInit?.method).toBe('DELETE');
    });

    it('should list secrets successfully supporting both array and wrapped response formats', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123' });
      const mockSecrets = [
        {
          id: 'sec_123',
          createdAt: '2026-06-19T00:00:00Z',
          expiresAt: '2026-06-20T00:00:00Z',
          views: 0,
          maxViews: 1,
          status: 'active',
        },
      ];

      // 1. Test raw array response
      const fetchSpyArray = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockSecrets),
      } as Response);

      let list = await client.secrets.list();
      expect(list).toEqual(mockSecrets);
      expect(fetchSpyArray).toHaveBeenCalledTimes(1);

      fetchSpyArray.mockRestore();

      // 2. Test wrapped { data: [...] } response
      const fetchSpyWrapped = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: mockSecrets }),
      } as Response);

      list = await client.secrets.list();
      expect(list).toEqual(mockSecrets);
      expect(fetchSpyWrapped).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Mapping & Response Parsing', () => {
    const client = new Secrettly({ apiKey: 'sk_live_123' });

    it('should throw AuthenticationError on 401', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Invalid API Key' }),
      } as Response);

      await expect(client.secrets.get('sec_123')).rejects.toThrow(AuthenticationError);
      await expect(client.secrets.get('sec_123')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid API Key',
      });
    });

    it('should throw RateLimitError on 429', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ message: 'Rate limit exceeded' }),
      } as Response);

      await expect(client.secrets.get('sec_123')).rejects.toThrow(RateLimitError);
      await expect(client.secrets.get('sec_123')).rejects.toMatchObject({
        statusCode: 429,
        message: 'Rate limit exceeded',
      });
    });

    it('should throw ValidationError on 400 or 422', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ message: 'Invalid expire format' }),
      } as Response);

      await expect(client.secrets.get('sec_123')).rejects.toThrow(ValidationError);
      await expect(client.secrets.get('sec_123')).rejects.toMatchObject({
        message: 'Invalid expire format',
      });
    });

    it('should throw ApiError on other non-2xx statuses', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error Text',
      } as Response);

      // Disable retries for this test so we get the 500 ApiError immediately
      const singleAttemptClient = new Secrettly({ apiKey: 'sk_123', retries: 0 });
      await expect(singleAttemptClient.secrets.get('sec_123')).rejects.toThrow(ApiError);
    });
  });

  describe('Retries & Backoff Logic', () => {
    it('should retry on 5xx server errors and eventually throw ApiError', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123', retries: 2 });
      
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => 'Bad Gateway',
      } as Response);

      // We spy on setTimeout to avoid sleeping during tests
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      await expect(client.secrets.get('sec_123')).rejects.toThrow(ApiError);
      // 1 initial attempt + 2 retries = 3 total attempts
      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(setTimeoutSpy).toHaveBeenCalled();
    });

    it('should retry on network connection failure (TypeError) and eventually throw NetworkError', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123', retries: 2 });
      
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(
        new TypeError('Failed to fetch')
      );

      vi.spyOn(globalThis, 'setTimeout');

      await expect(client.secrets.get('sec_123')).rejects.toThrow(NetworkError);
      expect(fetchSpy).toHaveBeenCalledTimes(3);
    });

    it('should NOT retry on client errors (400, 401, 429)', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123', retries: 3 });
      
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response);

      await expect(client.secrets.get('sec_123')).rejects.toThrow(AuthenticationError);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Request Timeout', () => {
    it('should throw NetworkError if request exceeds timeout duration', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123', timeout: 50, retries: 0 });

      // Mock fetch to reject with AbortError when signal is aborted
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        return new Promise((resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              reject(new DOMException('The user aborted a request.', 'AbortError'));
            });
          }
        });
      });

      await expect(client.secrets.get('sec_123')).rejects.toThrow(NetworkError);
      await expect(client.secrets.get('sec_123')).rejects.toThrow('Request timed out after 50ms');
    });
  });

  describe('Public Secret Reveal', () => {
    it('should reveal a secret without authorization header', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123' });
      const mockResponse = { content: 'decrypted_plaintext' };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const secret = await client.secrets.reveal('ac78de9b0a1f2b3c');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(secret).toEqual(mockResponse);
      
      const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
      expect(calledUrl).toBe('https://api.secrettly.space/v1/secrets/reveal/ac78de9b0a1f2b3c');
      expect(calledInit?.method).toBe('GET');
      expect(calledInit?.headers).not.toHaveProperty('Authorization');
    });
  });

  describe('Events Audit Logs', () => {
    it('should query events list with pagination', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123' });
      const mockResponse = {
        data: [
          {
            id: 'ev_123',
            type: 'secret.created',
            organizationId: 'org_123',
            userId: 'usr_123',
            createdAt: '2026-06-19T19:44:03.000Z',
          }
        ],
        page: 1,
        limit: 10,
        total: 1
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const events = await client.events.list({ page: 1, limit: 10 });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(events).toEqual(mockResponse);
      
      const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
      expect(calledUrl).toBe('https://api.secrettly.space/v1/events?page=1&limit=10');
      expect(calledInit?.method).toBe('GET');
    });

    it('should query events list with no options', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123' });
      const mockResponse = { data: [], page: 1, limit: 20 };
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const events = await client.events.list();
      expect(events).toEqual(mockResponse);
      expect(fetchSpy.mock.calls[0][0]).toBe('https://api.secrettly.space/v1/events');
    });
  });

  describe('Webhooks & Verification', () => {
    it('should register a webhook successfully', async () => {
      const client = new Secrettly({ apiKey: 'sk_live_123' });
      const mockResponse = {
        id: 'wh_123',
        url: 'https://domain.com/webhook',
        secret: 'whsec_secret',
        events: ['secret.created'],
        isActive: true,
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      } as Response);

      const webhook = await client.webhooks.register({
        url: 'https://domain.com/webhook',
        events: ['secret.created'],
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(webhook).toEqual(mockResponse);
      const [calledUrl, calledInit] = fetchSpy.mock.calls[0];
      expect(calledUrl).toBe('https://api.secrettly.space/v1/webhooks');
      expect(calledInit?.method).toBe('POST');
    });

    it('should verify correct webhook HMAC signatures', async () => {
      const payload = '{"id":"sec_123","status":"consumed"}';
      const secret = 'whsec_test_secret';
      const timestamp = Math.floor(Date.now() / 1000);
      
      const crypto = await import('crypto');
      const signaturePayload = `${timestamp}.${payload}`;
      const v1Signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
      const header = `t=${timestamp},v1=${v1Signature}`;

      const isValid = await Webhooks.verifySignature(payload, header, secret);
      expect(isValid).toBe(true);
    });

    it('should fail webhook verification on timestamp mismatch (replay attack)', async () => {
      const payload = '{"id":"sec_123"}';
      const secret = 'whsec_test_secret';
      const timestamp = Math.floor(Date.now() / 1000) - 600;
      
      const crypto = await import('crypto');
      const signaturePayload = `${timestamp}.${payload}`;
      const v1Signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
      const header = `t=${timestamp},v1=${v1Signature}`;

      const isValid = await Webhooks.verifySignature(payload, header, secret, 300);
      expect(isValid).toBe(false);
    });

    it('should return false if verification inputs are missing', async () => {
      expect(await Webhooks.verifySignature('', 'header', 'sec')).toBe(false);
      expect(await Webhooks.verifySignature('body', '', 'sec')).toBe(false);
      expect(await Webhooks.verifySignature('body', 'header', '')).toBe(false);
    });

    it('should return false if signature header format is invalid', async () => {
      expect(await Webhooks.verifySignature('body', 'invalid_header', 'sec')).toBe(false);
      expect(await Webhooks.verifySignature('body', 't=123', 'sec')).toBe(false);
      expect(await Webhooks.verifySignature('body', 'v1=abc', 'sec')).toBe(false);
      expect(await Webhooks.verifySignature('body', 't=abc,v1=xyz', 'sec')).toBe(false);
    });

    it('should verify signature ignoring tolerance if tolerance is 0', async () => {
      const payload = '{"id":"sec_123"}';
      const secret = 'whsec_test_secret';
      const timestamp = Math.floor(Date.now() / 1000) - 600;
      
      const crypto = await import('crypto');
      const signaturePayload = `${timestamp}.${payload}`;
      const v1Signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
      const header = `t=${timestamp},v1=${v1Signature}`;

      const isValid = await Webhooks.verifySignature(payload, header, secret, 0);
      expect(isValid).toBe(true);
    });
  });
});
