# Secrettly Node.js / TypeScript SDK

[![npm version](https://img.shields.io/npm/v/@secrettly/sdk.svg)](https://www.npmjs.com/package/@secrettly/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Secrettly** is the developer-first platform for sharing ephemeral secrets, credentials, API keys, tokens, certificates, and sensitive documents.

The `@secrettly/sdk` is a lightweight, zero-dependency, modern TypeScript library compatible with **Node.js (20+)**, **Bun**, **Deno**, and modern **browsers**.

---

## Getting Started

### Installation

Install the SDK package using your preferred package manager:

```bash
# npm
npm install @secrettly/sdk

# yarn
yarn add @secrettly/sdk

# pnpm
pnpm add @secrettly/sdk

# Bun
bun add @secrettly/sdk
```

---

## Testing & Local Development

If you want to clone this repository, run the test suites, check coverage, and experiment with the SDK, follow the guide below.

### 1. Prerequisites
Make sure you have Node.js (v20 or higher) installed.

### 2. Clone and Setup
Clone the repository and install all dependencies:
```bash
git clone https://github.com/holasoymalva/secrettly-sdk.git
cd secrettly-sdk
npm install
```

### 3. Running Unit Tests
We use **Vitest** for unit testing. You can run all the tests once, watch for changes, or generate a code coverage report:

```bash
# Run tests once
npm run test

# Run tests in watch mode (interactive)
npm run test:watch

# Run tests with code coverage report
npm run test:coverage
```

### 4. Running the Examples
We have included runnable TypeScript examples under the `examples/` directory. 

To execute them, set your `SECRETTLY_API_KEY` (if you have one) or run them as-is to see the SDK's built-in error handling and backoff retries in action:

```bash
# Set your API Key (Optional)
export SECRETTLY_API_KEY="sk_live_your_key_here"

# Run the create-secret example
npx tsx examples/create-secret.ts

# Run the list-secrets example
npx tsx examples/list-secrets.ts

# Run the revoke-secret example
npx tsx examples/revoke-secret.ts
```

### 5. Compiling the SDK
You can compile the TypeScript source files to ESM and CommonJS bundle formats:
```bash
npm run build
```
This builds and cleans the output into the `dist/` directory, outputting:
- `dist/index.js` (ES Modules)
- `dist/index.cjs` (CommonJS)
- `dist/index.d.ts` & `dist/index.d.cts` (TypeScript Declaration Files)

---

## SDK Usage Guide

### Basic Initialization

Initialize the client with your Secrettly API key:

```typescript
import { Secrettly } from "@secrettly/sdk";

const client = new Secrettly({
  apiKey: process.env.SECRETTLY_API_KEY!,
});
```

### Advanced Configuration

You can customize timeouts and retry numbers (for network/5xx server errors):

```typescript
const client = new Secrettly({
  apiKey: "sk_live_...",
  
  // Custom API endpoint (e.g. for self-hosting)
  baseUrl: "https://api.secrettly.space/v1",
  
  // Timeout in milliseconds (default: 10000ms)
  timeout: 5000, 
  
  // Max retries for network or 5xx server errors (default: 3)
  retries: 5,
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
- **Response Format:**
  - `id` (string): Unique identifier for the secret.
  - `url` (string): URL to view/retrieve the secret.
  - `expiresAt` (string): ISO timestamp of expiration.

#### `get(id: string): Promise<SecretMetadata>`
Retrieves the metadata of a secret without showing the content (preserving ephemeral access logs).
- **Response Format:**
  - `id` (string): Unique identifier.
  - `createdAt` (string): ISO timestamp of creation.
  - `expiresAt` (string): ISO timestamp of expiration.
  - `views` (number): Current views count.
  - `maxViews` (number): Maximum allowed views.
  - `status` (string): Status of the secret (`"active" | "revoked" | "expired" | "view_limit_reached"`).

#### `revoke(id: string): Promise<RevokeSecretResponse>`
Immediately invalidates and revokes an active secret.
- **Response Format:**
  - `success` (boolean): `true` if successfully revoked.

#### `list(): Promise<SecretMetadata[]>`
Lists the metadata for all secrets.
- **Response Format:**
  - `Array<SecretMetadata>`: Array of secret metadata configurations.

---

## Error Handling

The SDK exposes a hierarchy of custom error classes extending `SecrettlyError`. You can catch and inspect the error instances to take appropriate action:

```typescript
import { 
  Secrettly, 
  AuthenticationError, 
  ValidationError, 
  RateLimitError,
  ApiError,
  NetworkError
} from "@secrettly/sdk";

const client = new Secrettly({ apiKey: "sk_live_..." });

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
    // Generic API responses fallback (e.g., 404, 500 status codes)
    console.error(`API Error (${error.statusCode}):`, error.message);
  } else {
    // Other errors
    console.error("Unexpected error:", error);
  }
}
```

---

## License

MIT &copy; Secrettly Team