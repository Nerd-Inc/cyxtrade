/**
 * Deploy Mock USDT for testing on Shasta
 *
 * Run: node scripts/deploy-mock-usdt.js
 */

require('dotenv').config();
const TronWeb = require('tronweb');

const tronWeb = new TronWeb({
  fullHost: 'https://api.shasta.trongrid.io',
  privateKey: process.env.TRON_PRIVATE_KEY
});

// Simple ERC20 Mock
const MOCK_USDT_BYTECODE = `
608060405234801561001057600080fd5b506040518060400160405280600981526020017f4d6f636b205553445400000000000000000000000000000000000000000000008152506040518060400160405280600481526020017f555344540000000000000000000000000000000000000000000000000000000081525081600390816100899190610324565b50806004908161009991906
`;

// For simplicity, let's just mint from an existing Shasta USDT
// Or use TronWeb to deploy a minimal mock

async function main() {
  const myAddress = tronWeb.address.fromPrivateKey(process.env.TRON_PRIVATE_KEY);

  console.log('=== Deploy Mock USDT ===\n');
  console.log('Deployer:', myAddress);

  // Check balance
  const balance = await tronWeb.trx.getBalance(myAddress);
  console.log('TRX Balance:', balance / 1e6, 'TRX\n');

  if (balance < 100 * 1e6) {
    console.log('Need at least 100 TRX to deploy');
    return;
  }

  // For Shasta testing, we can use TronGrid's test token
  // Or manually send test tokens

  console.log('For Shasta testing, use existing test USDT:');
  console.log('TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs');
  console.log('\nOr get test tokens from:');
  console.log('https://shasta.tronscan.org/#/tools/token-creator');
}

main().catch(console.error);
