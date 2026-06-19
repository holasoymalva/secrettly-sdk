import { Secrettly, ApiError } from '../src/index.js';

const client = new Secrettly({
  apiKey: process.env.SECRETTLY_API_KEY || 'sk_test_mock_key',
});

async function main() {
  const secretId = 'sec_123';

  try {
    console.log(`Fetching metadata for secret: ${secretId}`);
    const metadata = await client.secrets.get(secretId);
    
    console.log('\nSecret Metadata:');
    console.log('----------------');
    console.log(`ID:         ${metadata.id}`);
    console.log(`Created At: ${metadata.createdAt}`);
    console.log(`Expires At: ${metadata.expiresAt}`);
    console.log(`Views:      ${metadata.views} / ${metadata.maxViews}`);
    console.log(`Status:     ${metadata.status}`);

    if (metadata.status === 'active') {
      console.log(`\nRevoking secret ${secretId}...`);
      const result = await client.secrets.revoke(secretId);
      
      console.log(`Success: ${result.success}`);
    } else {
      console.log(`\nSecret is not active (status: ${metadata.status}). Skipping revocation.`);
    }

  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API Error (${error.statusCode}):`, error.message);
    } else {
      console.error('An unexpected error occurred:', error);
    }
  }
}

main();
