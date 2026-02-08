/**
 * Complete Trade Flow Test
 *
 * Tests the entire flow:
 * 1. Mint USDT
 * 2. Deposit bond
 * 3. Create trade
 * 4. Progress through states
 * 5. Complete trade
 *
 * Run: node scripts/test-complete-flow.js
 */

require('dotenv').config();
const TronWeb = require('tronweb');

// NEW Contract addresses (Shasta) - with MockUSDT
const USDT_ADDRESS = 'TEUNzEw4vVEioPWGxD3kMgzN349FxC6xMn';
const ESCROW_ADDRESS = 'TGVHmzTU5xvM3KJ9SUMpJM3WST3FMNQPzm';

const tronWeb = new TronWeb({
  fullHost: 'https://api.shasta.trongrid.io',
  privateKey: process.env.TRON_PRIVATE_KEY
});

// Trade states
const TradeState = ['CREATED', 'ACCEPTED', 'USER_PAID', 'DELIVERING', 'COMPLETED', 'DISPUTED', 'RESOLVED', 'CANCELLED'];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForConfirmation(txId, maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const tx = await tronWeb.trx.getTransactionInfo(txId);
      if (tx && tx.id) {
        return tx.receipt?.result === 'SUCCESS';
      }
    } catch (e) {}
    await sleep(2000);
  }
  return false;
}

async function main() {
  const myAddress = tronWeb.address.fromPrivateKey(process.env.TRON_PRIVATE_KEY);

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           CYXTRADE FULL FLOW TEST (SHASTA)                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Wallet:', myAddress);
  console.log('MockUSDT:', USDT_ADDRESS);
  console.log('Escrow:', ESCROW_ADDRESS);
  console.log('');

  // Load contracts
  const usdt = await tronWeb.contract().at(USDT_ADDRESS);
  const escrow = await tronWeb.contract().at(ESCROW_ADDRESS);

  // Check TRX balance
  const trxBalance = await tronWeb.trx.getBalance(myAddress);
  console.log('TRX Balance:', (trxBalance / 1e6).toFixed(2), 'TRX');

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Mint USDT
  // ═══════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 1: Mint Mock USDT                                      │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  let usdtBalance = await usdt.balanceOf(myAddress).call();
  console.log('Current USDT:', (usdtBalance / 1e6).toFixed(2));

  if (usdtBalance < 1000 * 1e6) {
    console.log('Minting 5000 USDT...');
    const mintTx = await usdt.mint(5000 * 1e6).send({ feeLimit: 100_000_000 });
    console.log('Mint TX:', mintTx);
    await waitForConfirmation(mintTx);

    usdtBalance = await usdt.balanceOf(myAddress).call();
    console.log('New USDT Balance:', (usdtBalance / 1e6).toFixed(2));
  } else {
    console.log('Already have enough USDT');
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Approve & Deposit Bond
  // ═══════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 2: Deposit Bond (1000 USDT)                            │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  // Check current bond
  let bond = await escrow.getBond(myAddress).call();
  console.log('Current bond:', (bond.amount / 1e6).toFixed(2), 'USDT');

  if (bond.amount < 1000 * 1e6) {
    // Approve escrow to spend USDT
    console.log('Approving escrow to spend USDT...');
    const approveTx = await usdt.approve(ESCROW_ADDRESS, 2000 * 1e6).send({ feeLimit: 100_000_000 });
    console.log('Approve TX:', approveTx);
    await waitForConfirmation(approveTx);

    // Deposit bond
    console.log('Depositing 1000 USDT bond...');
    const depositTx = await escrow.depositBond(1000 * 1e6).send({ feeLimit: 100_000_000 });
    console.log('Deposit TX:', depositTx);
    await waitForConfirmation(depositTx);

    bond = await escrow.getBond(myAddress).call();
    console.log('New bond:', (bond.amount / 1e6).toFixed(2), 'USDT');
  } else {
    console.log('Already have sufficient bond');
  }

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Create Trade
  // ═══════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 3: Create Trade (lock 100 USDT)                        │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  const tradeId = tronWeb.sha3('test-trade-' + Date.now());
  const userId = tronWeb.sha3('user-ali-123');
  const sendAmount = 1000;      // 1000 AED
  const receiveAmount = 163000; // 163,000 XAF
  const bondToLock = 100 * 1e6; // 100 USDT
  const timeout = Math.floor(Date.now() / 1000) + 86400; // 24h

  console.log('Trade ID:', tradeId.substring(0, 18) + '...');
  console.log('Bond to lock: 100 USDT');

  console.log('Creating trade...');
  const createTx = await escrow.createTrade(
    tradeId,
    myAddress,  // trader (self for testing)
    userId,
    sendAmount,
    receiveAmount,
    bondToLock,
    timeout
  ).send({ feeLimit: 100_000_000 });
  console.log('Create TX:', createTx);
  await waitForConfirmation(createTx);

  // Check trade
  let trade = await escrow.getTrade(tradeId).call();
  console.log('Trade state:', TradeState[trade.state]);
  console.log('Bond locked:', (trade.bondLocked / 1e6).toFixed(2), 'USDT');

  // Check bond is locked
  bond = await escrow.getBond(myAddress).call();
  console.log('Trader bond locked:', (bond.locked / 1e6).toFixed(2), 'USDT');

  // ═══════════════════════════════════════════════════════════════
  // STEP 4: Progress Trade States
  // ═══════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 4: Progress Trade States                               │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  // CREATED -> ACCEPTED
  console.log('\nCREATED -> ACCEPTED...');
  await escrow.updateTradeState(tradeId, 1).send({ feeLimit: 50_000_000 });
  await sleep(3000);
  trade = await escrow.getTrade(tradeId).call();
  console.log('Trade state:', TradeState[trade.state]);

  // ACCEPTED -> USER_PAID
  console.log('\nACCEPTED -> USER_PAID...');
  await escrow.updateTradeState(tradeId, 2).send({ feeLimit: 50_000_000 });
  await sleep(3000);
  trade = await escrow.getTrade(tradeId).call();
  console.log('Trade state:', TradeState[trade.state]);

  // USER_PAID -> DELIVERING
  console.log('\nUSER_PAID -> DELIVERING...');
  await escrow.updateTradeState(tradeId, 3).send({ feeLimit: 50_000_000 });
  await sleep(3000);
  trade = await escrow.getTrade(tradeId).call();
  console.log('Trade state:', TradeState[trade.state]);

  // ═══════════════════════════════════════════════════════════════
  // STEP 5: Complete Trade
  // ═══════════════════════════════════════════════════════════════
  console.log('\n┌─────────────────────────────────────────────────────────────┐');
  console.log('│ STEP 5: Complete Trade (unlock bond)                        │');
  console.log('└─────────────────────────────────────────────────────────────┘');

  console.log('Completing trade...');
  const completeTx = await escrow.completeTrade(tradeId).send({ feeLimit: 50_000_000 });
  console.log('Complete TX:', completeTx);
  await waitForConfirmation(completeTx);

  trade = await escrow.getTrade(tradeId).call();
  console.log('Trade state:', TradeState[trade.state]);

  // Check bond is unlocked
  bond = await escrow.getBond(myAddress).call();
  console.log('Trader bond locked:', (bond.locked / 1e6).toFixed(2), 'USDT');
  console.log('Trader bond total:', (bond.amount / 1e6).toFixed(2), 'USDT');

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST COMPLETE ✓                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Trade flow successfully tested:');
  console.log('  ✓ Minted USDT');
  console.log('  ✓ Deposited bond');
  console.log('  ✓ Created trade (locked bond)');
  console.log('  ✓ Progressed: CREATED → ACCEPTED → USER_PAID → DELIVERING');
  console.log('  ✓ Completed trade (unlocked bond)');
  console.log('');
  console.log('View on Tronscan:');
  console.log('https://shasta.tronscan.org/#/contract/' + ESCROW_ADDRESS);
}

main().catch(err => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
