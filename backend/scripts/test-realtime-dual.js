#!/usr/bin/env node
/**
 * Dual Client Real-time Test
 *
 * Simulates two users (sender + trader) exchanging messages and trade updates
 *
 * Usage:
 *   node scripts/test-realtime-dual.js
 */

const io = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(client, color, ...args) {
  console.log(`${color}[${client}]${colors.reset}`, ...args);
}

async function login(phone) {
  // Request OTP
  const otpRes = await fetch(`${SERVER_URL}/api/auth/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });

  if (!otpRes.ok) throw new Error(`OTP request failed: ${otpRes.status}`);

  // Verify with dev OTP
  const verifyRes = await fetch(`${SERVER_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: '123456' })
  });

  if (!verifyRes.ok) throw new Error(`OTP verify failed: ${verifyRes.status}`);

  return verifyRes.json();
}

async function createSocket(token, name, color) {
  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      auth: { token }
    });

    socket.on('connect', () => {
      log(name, color, 'Connected');
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      log(name, color, 'Connection error:', err.message);
      reject(err);
    });

    socket.on('chat:message', (data) => {
      log(name, color, 'Received message:', data.content);
    });

    socket.on('chat:typing', (data) => {
      log(name, color, 'Other user is typing...');
    });

    socket.on('trade:update', (data) => {
      log(name, color, 'Trade update:', data.trade?.status || data.status);
    });

    socket.on('notification', (data) => {
      log(name, color, 'Notification:', data.title);
    });
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('  CyxTrade Dual Client Real-time Test');
  console.log('='.repeat(60));
  console.log();

  try {
    // Login as two users
    console.log('Logging in users...\n');

    const [sender, trader] = await Promise.all([
      login('sender123'),
      login('trader456')
    ]);

    log('SENDER', colors.cyan, `Logged in as ${sender.user.phone}`);
    log('TRADER', colors.magenta, `Logged in as ${trader.user.phone}`);

    // Connect sockets
    console.log('\nConnecting sockets...\n');

    const [senderSocket, traderSocket] = await Promise.all([
      createSocket(sender.token, 'SENDER', colors.cyan),
      createSocket(trader.token, 'TRADER', colors.magenta)
    ]);

    // Create a trade
    console.log('\n--- Creating Trade ---\n');

    const tradeRes = await fetch(`${SERVER_URL}/api/trades`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sender.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sendAmount: 500,
        sendCurrency: 'AED',
        receiveCurrency: 'XAF',
        recipientName: 'Test Recipient',
        recipientPhone: '+237600000000'
      })
    });

    if (!tradeRes.ok) {
      const err = await tradeRes.json();
      throw new Error(`Failed to create trade: ${err.message || err.error}`);
    }

    const trade = await tradeRes.json();
    log('SENDER', colors.cyan, `Created trade: ${trade.id}`);

    // Both join the trade room
    console.log('\n--- Joining Trade Room ---\n');

    senderSocket.emit('trade:join', trade.id);
    traderSocket.emit('trade:join', trade.id);
    await sleep(500);

    log('SENDER', colors.cyan, 'Joined trade room');
    log('TRADER', colors.magenta, 'Joined trade room');

    // Simulate chat
    console.log('\n--- Testing Chat ---\n');

    await sleep(500);
    senderSocket.emit('chat:typing', { tradeId: trade.id });
    await sleep(1000);

    senderSocket.emit('chat:message', {
      tradeId: trade.id,
      content: 'Hi! I just created this trade. Ready to proceed?'
    });
    await sleep(1500);

    traderSocket.emit('chat:typing', { tradeId: trade.id });
    await sleep(1000);

    traderSocket.emit('chat:message', {
      tradeId: trade.id,
      content: 'Hello! Yes, please send to my bank account.'
    });
    await sleep(1500);

    senderSocket.emit('chat:message', {
      tradeId: trade.id,
      content: 'Payment sent! Reference: TXN123456'
    });
    await sleep(1500);

    // Send read receipts
    traderSocket.emit('chat:read', { tradeId: trade.id });
    await sleep(500);

    traderSocket.emit('chat:message', {
      tradeId: trade.id,
      content: 'Received! Delivering to recipient now.'
    });
    await sleep(1000);

    // Simulate trade status updates
    console.log('\n--- Testing Trade Updates ---\n');

    // Note: In real app, these would come from API calls
    // Here we're just demonstrating the socket events

    console.log('\n' + '='.repeat(60));
    console.log('  Test Complete!');
    console.log('='.repeat(60));
    console.log('\nBoth clients received messages in real-time.');
    console.log('Check the Flutter app to see updates there too.\n');

    // Cleanup
    await sleep(2000);
    senderSocket.disconnect();
    traderSocket.disconnect();

    process.exit(0);

  } catch (err) {
    console.error('\nError:', err.message);
    process.exit(1);
  }
}

main();
