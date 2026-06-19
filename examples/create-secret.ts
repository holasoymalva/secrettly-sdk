import { Secrettly, AuthenticationError, ValidationError } from '../src/index.js';

// Initialize the Secrettly client
// Replace with your actual live or test API Key
const client = new Secrettly({
  apiKey: process.env.SECRETTLY_API_KEY || 'sk_test_mock_key',
  timeout: 5000,
  retries: 2,
});

async function main() {
  try {
    console.log('Creating a new secret...');
    
    const secret = await client.secrets.create({
      content: 'DATABASE_URL=postgresql://postgres:secretpassword@localhost:5432/db',
      expiresIn: '1h',
      maxViews: 2,
    });

    console.log('\nSecret created successfully!');
    console.log('---------------------------');
    console.log(`ID:         ${secret.id}`);
    console.log(`URL:        ${secret.url}`);
    console.log(`Expires At: ${secret.expiresAt}`);
    
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation Error (Client/Server-side):', error.message);
    } else if (error instanceof AuthenticationError) {
      console.error('Authentication Error (Invalid API Key):', error.message);
    } else {
      console.error('An unexpected error occurred:', error);
    }
  }
}

main();
