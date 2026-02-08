/**
 * Test CyxTradeEscrow on Shasta Testnet
 *
 * Run: node scripts/test-escrow.js
 */

require('dotenv').config();
const TronWeb = require('tronweb');

// Contract addresses (Shasta)
const ESCROW_ADDRESS = 'TPK3zPHrMHxH8nEHTpNRxVBSMa5Y4UGvEo';
const USDT_ADDRESS = 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs'; // Shasta mock USDT

const tronWeb = new TronWeb({
  fullHost: 'https://api.shasta.trongrid.io',
  privateKey: process.env.TRON_PRIVATE_KEY
});

async function main() {
  const myAddress = tronWeb.address.fromPrivateKey(process.env.TRON_PRIVATE_KEY);

  console.log('=== CyxTradeEscrow Test ===\n');
  console.log('Wallet:', myAddress);

  // Check TRX balance
  const trxBalance = await tronWeb.trx.getBalance(myAddress);
  console.log('TRX Balance:', trxBalance / 1e6, 'TRX\n');

  // Load escrow contract
  const escrow = await tronWeb.contract().at(ESCROW_ADDRESS);

  // 1. Check contract state
  console.log('--- Contract State ---');
  const backend = await escrow.backend().call();
  console.log('Backend address:', tronWeb.address.fromHex(backend));

  // 2. Check bond balance (will be 0 for new trader)
  console.log('\n--- Bond Check ---');
  try {
    const bond = await escrow.getBond(myAddress).call();
    console.log('Bond amount:', bond.amount.toString() / 1e6, 'USDT');
    console.log('Bond locked:', bond.locked.toString() / 1e6, 'USDT');
    console.log('Bond active:', bond.active);
  } catch (e) {
    console.log('No bond yet (expected for new wallet)');
  }

  // 3. Check available bond
  console.log('\n--- Available Bond ---');
  try {
    const available = await escrow.getAvailableBond(myAddress).call();
    console.log('Available:', available.toString() / 1e6, 'USDT');
  } catch (e) {
    console.log('Available: 0 USDT');
  }

  console.log('\n=== Test Complete ===');
  console.log('\nTo test full flow, you need:');
  console.log('1. Shasta USDT (get from faucet or deploy mock)');
  console.log('2. Approve escrow to spend USDT');
  console.log('3. Call depositBond()');
  console.log('\nView contract on Tronscan:');
  console.log('https://shasta.tronscan.org/#/contract/' + ESCROW_ADDRESS);
}

main().catch(console.error);
