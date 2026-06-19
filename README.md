# Secrettly Node.js / TypeScript SDK

[![npm version](https://img.shields.io/npm/v/@secrettly/sdk.svg)](https://www.npmjs.com/package/@secrettly/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Secrettly** is the developer-first platform for sharing ephemeral secrets, credentials, API keys, tokens, certificates, and sensitive documents.

The `@secrettly/sdk` is a lightweight, zero-dependency, modern TypeScript library compatible with **Node.js (20+)**, **Bun**, **Deno**, and modern **browsers**.

---

## Features

- **Runtime Agnostic:** Works flawlessly in Node.js, Deno, Bun, and browser environments.
- **Zero Dependencies:** Relies entirely on native `fetch` and standard Web Crypto APIs.
- **Modern ESM First:** Built using ES Modules with CommonJS fallback support.
- **Robust HTTP Client:** Built-in automatic retries with exponential backoff + jitter, configurable timeouts, and AbortController.
- **Type Safe:** Complete TypeScript definitions and JSDoc documentation out-of-the-box.
- **Robust Error Handling:** Rich error hierarchy (`ValidationError`, `AuthenticationError`, `RateLimitError`, `NetworkError`, etc.).

---

## Installation

### Node.js (npm, yarn, pnpm)
```bash
npm install @secrettly/sdk
# or
yarn add @secrettly/sdk
# or
pnpm add @secrettly/sdk
```

### Bun
```bash
bun add @secrettly/sdk
```

### Deno
Import directly using npm specifiers:
```ts
import { Secrettly } from "npm:@secrettly/sdk";
```

---

## Quick Start

### 1. Create a Secret
Initialize the client with your Secrettly HMAC API key (`sk_live_...`):

```typescript
import { Secrettly } from "@secrettly/sdk";

const client = new Secrettly({
  apiKey: process.env.SECRETTLY_API_KEY!,
});

// Create an ephemeral secret link
const secret = await client.secrets.create({
  content: "DATABASE_URL=postgresql://postgres:secret@localhost:5432/db",
  expiresIn: "1h", // Supported units: m (minutes), h (hours), d (days)
  maxViews: 1,
});

console.log(`Secret created! Ephemeral Link: ${secret.url}`);
// Output: https://secrettly.space/s/ac78de9b0a1f2b3c
```

### 2. Reveal a Secret (Public Endpoint)
To decrypt/consume the secret payload, use the public reveal endpoint. This is unauthenticated, as the `revealToken` inside the URL serves as the authorization.

```typescript
// Extract the reveal token from the secret URL (e.g., "ac78de9b0a1f2b3c")
const result = await client.secrets.reveal("ac78de9b0a1f2b3c");

console.log(`Decrypted secret content: ${result.content}`);
```

---

## Configuration

Customize the SDK client options during initialization:

```typescript
const client = new Secrettly({
  apiKey: "sk_live_...",
  
  // Custom API endpoint (e.g. for local development or self-hosting)
  baseUrl: "http://localhost:3000",
  
  // Timeout in milliseconds (default: 10000ms)
  timeout: 5000, 
  
  // Max retries for network or 5xx server errors (default: 3)
  retries: 5,
});
```

---

## Error Handling

The SDK exposes a hierarchy of custom error classes extending `SecrettlyError`. You can inspect the error instance to take appropriate actions:

```typescript
import { 
  Secrettly, 
  AuthenticationError, 
  ValidationError, 
  RateLimitError,
  ApiError,
  NetworkError
} from "@secrettly/sdk";

try {
  const secret = await client.secrets.create({
    content: "API_SECRET_TOKEN",
    expiresIn: "12h"
  });
} catch (error) {
  if (error instanceof ValidationError) {
    // Thrown for client-side input validation or API 400/422 requests
    console.error("Invalid parameters:", error.message);
  } else if (error instanceof AuthenticationError) {
    // Thrown when the API key is invalid or revoked (HTTP 401)
    console.error("Authentication failed:", error.message);
  } else if (error instanceof RateLimitError) {
    // Thrown when the rate limit has been exceeded (HTTP 429)
    console.error("Rate limited. Please backoff:", error.message);
  } else if (error instanceof NetworkError) {
    // Thrown for timeouts or total network connection losses
    console.error("Network / Timeout error:", error.message);
  } else if (error instanceof ApiError) {
    // Generic API responses fallback (e.g. 404, 500 status codes)
    console.error(`API Error (${error.statusCode}):`, error.message);
  }
}
```

---

## Webhook Signature Verification

Secrettly sends HTTP webhooks to your endpoints on lifecycle changes (e.g., `secret.created`, `secret.opened`). Every request includes a `Secrettly-Signature` header.

You can verify the webhook signatures using our runtime-agnostic static helper:

```typescript
import { Webhooks } from "@secrettly/sdk";

// In your Express or NestJS webhook handler:
app.post("/webhooks", express.raw({ type: "application/json" }), async (req, res) => {
  const signatureHeader = req.headers["secrettly-signature"];
  const rawBodyText = req.body.toString();
  const webhookSigningSecret = "whsec_..."; // Returned during webhook registration
  
  const isValid = await Webhooks.verifySignature(
    rawBodyText,
    signatureHeader,
    webhookSigningSecret
  );

  if (!isValid) {
    return res.status(400).send("Invalid signature");
  }

  // Signature verified, process webhook safely
  const event = JSON.parse(rawBodyText);
  console.log(`Received event type: ${event.type}`);
  res.status(200).send("ok");
});
```

---

## API Reference

### `client.secrets`

#### `create(request: CreateSecretRequest): Promise<Secret>`
Creates an encrypted ephemeral secret.
- **Request Parameters:**
  - `content` (string, required): The secret data.
  - `expiresIn` (string, optional): Expiration duration (e.g. `"15m"`, `"1h"`, `"7d"`).
  - `maxViews` (number, optional): Max retrieval counts. Defaults to `1`.

#### `reveal(revealToken: string): Promise<RevealSecretResponse>`
Publicly decrypts and consumes the secret payload using its reveal token. **This endpoint is unauthenticated.**
- **Response Format:**
  - `content` (string): Plaintext secret payload.

#### `get(id: string): Promise<SecretMetadata>`
Retrieves the metadata of a secret without showing the content (preserving ephemeral security).
- **Response Format:**
  - `id` (string): Unique identifier.
  - `createdAt` (string): ISO timestamp of creation.
  - `expiresAt` (string): ISO timestamp of expiration.
  - `views` (number): Current views count.
  - `maxViews` (number): Maximum allowed views.
  - `status` (string): Status of the secret (`"active" | "revoked" | "expired" | "view_limit_reached" | "CONSUMED" | "REVOKED"`).

#### `revoke(id: string): Promise<RevokeSecretResponse>`
Immediately invalidates and revokes an active secret.
- **Response Format:**
  - `success` (boolean): `true` if successfully revoked.
  - `id` (string): Unique identifier of the revoked secret.
  - `status` (string): Status of the secret (`"REVOKED"`).
  - `updatedAt` (string): ISO timestamp of revocation.

#### `list(): Promise<SecretMetadata[]>`
Lists the metadata for all secrets.

---

### `client.events`

#### `list(options?: { page?: number, limit?: number }): Promise<ListEventsResponse>`
Retrieves paginated audit event logs scoped by organization.
- **Response Format:**
  - `data` (EventLog[]): Array of event items (`{ id, type, organizationId, userId, metadata, createdAt }`).
  - `page` (number): Current page.
  - `limit` (number): Limit per page.
  - `total` (number): Total matching audit events.

---

### `client.webhooks`

#### `register(request: WebhookRegistrationRequest): Promise<WebhookRegistrationResponse>`
Registers a new webhook listener endpoint.
- **Request Parameters:**
  - `url` (string, required): Endpoint URL.
  - `events` (string[], required): Event types to subscribe to (e.g., `["secret.created", "secret.opened"]`).
- **Response Format:**
  - `id` (string): Unique identifier of the webhook.
  - `url` (string): Registered destination URL.
  - `secret` (string): Webhook signing secret (`whsec_...`).
  - `events` (string[]): Subscribed events.
  - `isActive` (boolean): `true` if active.

---

## Testing & Local Development

### 1. Clone and Setup
```bash
git clone https://github.com/holasoymalva/secrettly-sdk.git
cd secrettly-sdk
npm install
```

### 2. Running Unit Tests & Coverage
We use **Vitest** for testing:
```bash
npm run test           # Run tests once
npm run test:coverage  # Run tests with code coverage report
```

### 3. Compiling the SDK
```bash
npm run build          # Compiles to ESM and CJS bundle formats under /dist
```

---

## License

MIT &copy; Secrettly Team