/**
 * End-to-End Trade Test Script
 *
 * Tests the complete trade lifecycle:
 * 1. Create trade
 * 2. Trader accepts trade
 * 3. User marks as paid
 * 4. Trader marks as delivered
 * 5. User completes trade
 * 6. User rates trader
 *
 * Run with: npx ts-node scripts/test-e2e-trade.ts
 */

import axios, { AxiosInstance } from 'axios';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_USER_PHONE = process.env.TEST_USER_PHONE || '+971501234567';
const TEST_TRADER_PHONE = process.env.TEST_TRADER_PHONE || '+237699123456';

// Test data
const TEST_TRADE = {
  sendCurrency: 'AED',
  sendAmount: 100,
  receiveCurrency: 'XAF',
  recipientName: 'Marie Test',
  recipientPhone: '+237699000000',
  recipientMethod: 'mtn_momo',
};

interface TestContext {
  userToken: string;
  traderToken: string;
  userId: string;
  traderId: string;
  traderProfileId: string;
  tradeId: string;
}

const ctx: Partial<TestContext> = {};

// Create axios instances
function createClient(token?: string): AxiosInstance {
  return axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true, // Don't throw on error status
  });
}

// Helper to log step
function step(name: string, success: boolean, details?: string) {
  const icon = success ? '✅' : '❌';
  console.log(`${icon} ${name}${details ? `: ${details}` : ''}`);
  if (!success) {
    throw new Error(`Step failed: ${name}`);
  }
}

// Helper to wait
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ Test Steps ============

async function loginUser(phone: string): Promise<{ token: string; userId: string }> {
  const client = createClient();

  // Request OTP (in dev mode, OTP is logged or bypassed)
  const otpRes = await client.post('/auth/send-otp', { phone });
  if (otpRes.status !== 200) {
    throw new Error(`Failed to send OTP: ${otpRes.data.message}`);
  }

  // In dev mode, use test OTP '123456'
  const loginRes = await client.post('/auth/verify-otp', {
    phone,
    otp: '123456',
  });

  if (loginRes.status !== 200) {
    throw new Error(`Failed to login: ${loginRes.data.message}`);
  }

  return {
    token: loginRes.data.data.token,
    userId: loginRes.data.data.user.id,
  };
}

async function getTraderProfile(token: string): Promise<string | null> {
  const client = createClient(token);
  const res = await client.get('/traders/me');

  if (res.status === 200 && res.data.data?.id) {
    return res.data.data.id;
  }
  return null;
}

async function findActiveTrader(token: string): Promise<{ id: string; displayName: string } | null> {
  const client = createClient(token);
  const res = await client.get('/traders', {
    params: {
      from: TEST_TRADE.sendCurrency,
      to: TEST_TRADE.receiveCurrency,
      online: true,
    },
  });

  if (res.status === 200 && res.data.data?.traders?.length > 0) {
    const trader = res.data.data.traders[0];
    return { id: trader.id, displayName: trader.displayName || 'Unknown' };
  }
  return null;
}

async function createTrade(token: string, traderId: string): Promise<string> {
  const client = createClient(token);
  const res = await client.post('/trades', {
    traderId,
    ...TEST_TRADE,
  });

  if (res.status !== 201 && res.status !== 200) {
    throw new Error(`Failed to create trade: ${res.data.message}`);
  }

  return res.data.data.id;
}

async function getTradeStatus(token: string, tradeId: string): Promise<{ status: string; trade: any }> {
  const client = createClient(token);
  const res = await client.get(`/trades/${tradeId}`);

  if (res.status !== 200) {
    throw new Error(`Failed to get trade: ${res.data.message}`);
  }

  return {
    status: res.data.data.status,
    trade: res.data.data,
  };
}

async function acceptTrade(token: string, tradeId: string): Promise<void> {
  const client = createClient(token);
  const res = await client.put(`/trades/${tradeId}/accept`);

  if (res.status !== 200) {
    throw new Error(`Failed to accept trade: ${res.data.message}`);
  }
}

async function markTradePaid(token: string, tradeId: string): Promise<void> {
  const client = createClient(token);
  const res = await client.put(`/trades/${tradeId}/paid`, {
    reference: 'TEST-REF-123',
  });

  if (res.status !== 200) {
    throw new Error(`Failed to mark trade as paid: ${res.data.message}`);
  }
}

async function markTradeDelivered(token: string, tradeId: string): Promise<void> {
  const client = createClient(token);
  const res = await client.put(`/trades/${tradeId}/delivered`);

  if (res.status !== 200) {
    throw new Error(`Failed to mark trade as delivered: ${res.data.message}`);
  }
}

async function completeTrade(token: string, tradeId: string): Promise<void> {
  const client = createClient(token);
  const res = await client.put(`/trades/${tradeId}/complete`);

  if (res.status !== 200) {
    throw new Error(`Failed to complete trade: ${res.data.message}`);
  }
}

async function rateTrade(token: string, tradeId: string, rating: number): Promise<void> {
  const client = createClient(token);
  const res = await client.post(`/trades/${tradeId}/rate`, {
    rating,
    comment: 'Great service! Test completed successfully.',
  });

  if (res.status !== 200) {
    throw new Error(`Failed to rate trade: ${res.data.message}`);
  }
}

// ============ Main Test ============

async function runE2ETest() {
  console.log('═══════════════════════════════════════════════');
  console.log('   CyxTrade End-to-End Trade Test');
  console.log('═══════════════════════════════════════════════\n');

  try {
    // Step 1: Login as user
    console.log('📱 Step 1: Login as user...');
    const { token: userToken, userId } = await loginUser(TEST_USER_PHONE);
    ctx.userToken = userToken;
    ctx.userId = userId;
    step('User logged in', true, `ID: ${userId.slice(0, 8)}...`);

    // Step 2: Login as trader
    console.log('\n📱 Step 2: Login as trader...');
    const { token: traderToken, userId: traderUserId } = await loginUser(TEST_TRADER_PHONE);
    ctx.traderToken = traderToken;
    ctx.traderId = traderUserId;

    // Get trader profile
    const traderProfileId = await getTraderProfile(traderToken);
    if (!traderProfileId) {
      step('Trader profile', false, 'Trader not registered');
      return;
    }
    ctx.traderProfileId = traderProfileId;
    step('Trader logged in', true, `Profile: ${traderProfileId.slice(0, 8)}...`);

    // Step 3: User creates trade
    console.log('\n📝 Step 3: Create trade...');
    const tradeId = await createTrade(userToken, traderProfileId);
    ctx.tradeId = tradeId;
    step('Trade created', true, `ID: ${tradeId.slice(0, 8)}...`);

    // Verify status
    let { status, trade } = await getTradeStatus(userToken, tradeId);
    step('Trade status', status === 'pending', status);

    // Step 4: Trader accepts trade
    console.log('\n✋ Step 4: Trader accepts trade...');
    await acceptTrade(traderToken, tradeId);
    ({ status, trade } = await getTradeStatus(userToken, tradeId));
    step('Trade accepted', status === 'accepted', status);

    if (trade.bondLocked) {
      console.log(`   💰 Bond locked: $${trade.bondLocked}`);
    }

    // Step 5: User marks as paid
    console.log('\n💵 Step 5: User marks as paid...');
    await markTradePaid(userToken, tradeId);
    ({ status } = await getTradeStatus(userToken, tradeId));
    step('Trade marked paid', status === 'paid', status);

    // Step 6: Trader marks as delivered
    console.log('\n🚚 Step 6: Trader marks as delivered...');
    await markTradeDelivered(traderToken, tradeId);
    ({ status } = await getTradeStatus(userToken, tradeId));
    step('Trade marked delivered', status === 'delivering', status);

    // Step 7: User completes trade
    console.log('\n✅ Step 7: User completes trade...');
    await completeTrade(userToken, tradeId);
    ({ status, trade } = await getTradeStatus(userToken, tradeId));
    step('Trade completed', status === 'completed', status);

    // Step 8: User rates trader
    console.log('\n⭐ Step 8: User rates trader...');
    await rateTrade(userToken, tradeId, 5);
    step('Trade rated', true, '5 stars');

    // Summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('   ✅ E2E Trade Test PASSED');
    console.log('═══════════════════════════════════════════════');
    console.log('\nTrade Summary:');
    console.log(`  Trade ID: ${tradeId}`);
    console.log(`  Amount: ${TEST_TRADE.sendAmount} ${TEST_TRADE.sendCurrency}`);
    console.log(`  Recipient: ${TEST_TRADE.recipientName}`);
    console.log(`  Status: ${status}`);

  } catch (error: any) {
    console.log('\n═══════════════════════════════════════════════');
    console.log('   ❌ E2E Trade Test FAILED');
    console.log('═══════════════════════════════════════════════');
    console.error('\nError:', error.message);

    if (ctx.tradeId) {
      console.log(`\nTrade ID for debugging: ${ctx.tradeId}`);
    }

    process.exit(1);
  }
}

// Run the test
runE2ETest().catch(console.error);
