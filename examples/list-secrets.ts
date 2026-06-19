import { Secrettly } from '../src/index.js';

const client = new Secrettly({
  apiKey: process.env.SECRETTLY_API_KEY || 'sk_test_mock_key',
});

async function main() {
  try {
    console.log('Retrieving your secrets list...');
    const secrets = await client.secrets.list();

    console.log(`\nFound ${secrets.length} secrets:`);
    console.log('------------------------------------');
    
    secrets.forEach((secret) => {
      console.log(`- ID: ${secret.id}`);
      console.log(`  Status: ${secret.status}`);
      console.log(`  Views: ${secret.views}/${secret.maxViews}`);
      console.log(`  Expires: ${secret.expiresAt}`);
      console.log('');
    });
  } catch (error) {
    console.error('Failed to list secrets:', error);
  }
}

main();
