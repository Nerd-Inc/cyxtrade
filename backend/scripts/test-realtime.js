#!/usr/bin/env node
/**
 * Real-time Socket.IO Test Script
 *
 * Tests chat messages, typing indicators, and trade updates
 *
 * Usage:
 *   node scripts/test-realtime.js
 */

const io = require('socket.io-client');
const readline = require('readline');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// Test tokens - get these by logging in via the app
let TEST_TOKEN = process.env.TEST_TOKEN || null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function getTestToken() {
  // First, request OTP
  const phone = await question('Enter phone number to login: ');

  console.log('\nRequesting OTP...');
  const otpRes = await fetch(`${SERVER_URL}/api/auth/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone })
  });

  if (!otpRes.ok) {
    throw new Error(`Failed to request OTP: ${otpRes.status}`);
  }

  console.log('OTP sent (use 123456 for dev mode)');
  const otp = await question('Enter OTP: ');

  console.log('\nVerifying OTP...');
  const verifyRes = await fetch(`${SERVER_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp })
  });

  if (!verifyRes.ok) {
    throw new Error(`Failed to verify OTP: ${verifyRes.status}`);
  }

  const { token, user } = await verifyRes.json();
  console.log(`\nLogged in as: ${user.displayName || user.phone} (${user.id})`);

  return { token, user };
}

async function main() {
  console.log('='.repeat(50));
  console.log('  CyxTrade Real-Time Socket.IO Test');
  console.log('='.repeat(50));
  console.log(`\nConnecting to: ${SERVER_URL}\n`);

  // Get auth token
  const { token, user } = await getTestToken();

  // Connect to Socket.IO
  console.log('\nConnecting to Socket.IO...');
  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    auth: { token }
  });

  // Connection events
  socket.on('connect', () => {
    console.log('\n[CONNECTED] Socket ID:', socket.id);
    showMenu();
  });

  socket.on('disconnect', (reason) => {
    console.log('\n[DISCONNECTED]', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('\n[CONNECTION ERROR]', err.message);
  });

  // Chat events
  socket.on('chat:message', (data) => {
    console.log('\n[CHAT MESSAGE RECEIVED]');
    console.log('  From:', data.sender?.displayName || data.senderId);
    console.log('  Content:', data.content);
    console.log('  Trade:', data.tradeId);
    console.log('  Time:', new Date(data.createdAt).toLocaleTimeString());
  });

  socket.on('chat:typing', (data) => {
    console.log('\n[TYPING]', data.userId, 'is typing in trade', data.tradeId);
  });

  socket.on('chat:read', (data) => {
    console.log('\n[READ RECEIPT]', data.userId, 'read messages in trade', data.tradeId);
  });

  // Trade events
  socket.on('trade:update', (data) => {
    console.log('\n[TRADE UPDATE]');
    console.log('  Trade ID:', data.tradeId);
    console.log('  Status:', data.trade?.status || data.status);
    if (data.trade) {
      console.log('  Amount:', data.trade.sendAmount, data.trade.sendCurrency);
    }
  });

  // Notifications
  socket.on('notification', (data) => {
    console.log('\n[NOTIFICATION]');
    console.log('  Type:', data.type);
    console.log('  Title:', data.title);
    console.log('  Message:', data.message);
  });

  // Interactive menu
  let currentTradeId = null;

  function showMenu() {
    console.log('\n' + '-'.repeat(40));
    console.log('Commands:');
    console.log('  1. Join trade room');
    console.log('  2. Leave trade room');
    console.log('  3. Send chat message');
    console.log('  4. Send typing indicator');
    console.log('  5. Send read receipt');
    console.log('  6. List my trades');
    console.log('  7. Create test trade');
    console.log('  8. Show current trade');
    console.log('  q. Quit');
    console.log('-'.repeat(40));
  }

  async function handleCommand(cmd) {
    switch (cmd.trim()) {
      case '1': {
        const tradeId = await question('Enter trade ID: ');
        socket.emit('trade:join', tradeId);
        currentTradeId = tradeId;
        console.log(`Joined trade room: ${tradeId}`);
        break;
      }

      case '2': {
        if (currentTradeId) {
          socket.emit('trade:leave', currentTradeId);
          console.log(`Left trade room: ${currentTradeId}`);
          currentTradeId = null;
        } else {
          console.log('Not in any trade room');
        }
        break;
      }

      case '3': {
        if (!currentTradeId) {
          console.log('Join a trade room first (option 1)');
          break;
        }
        const content = await question('Message: ');
        socket.emit('chat:message', {
          tradeId: currentTradeId,
          content
        });
        console.log('Message sent');
        break;
      }

      case '4': {
        if (!currentTradeId) {
          console.log('Join a trade room first (option 1)');
          break;
        }
        socket.emit('chat:typing', { tradeId: currentTradeId });
        console.log('Typing indicator sent');
        break;
      }

      case '5': {
        if (!currentTradeId) {
          console.log('Join a trade room first (option 1)');
          break;
        }
        socket.emit('chat:read', { tradeId: currentTradeId });
        console.log('Read receipt sent');
        break;
      }

      case '6': {
        console.log('\nFetching trades...');
        const res = await fetch(`${SERVER_URL}/api/trades`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const { trades } = await res.json();

        if (trades.length === 0) {
          console.log('No trades found');
        } else {
          console.log('\nYour trades:');
          trades.forEach((t, i) => {
            console.log(`  ${i + 1}. [${t.status}] ${t.id}`);
            console.log(`     ${t.sendAmount} ${t.sendCurrency} → ${t.receiveAmount} ${t.receiveCurrency}`);
          });
        }
        break;
      }

      case '7': {
        console.log('\nCreating test trade...');
        const res = await fetch(`${SERVER_URL}/api/trades`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sendAmount: 100,
            sendCurrency: 'AED',
            receiveCurrency: 'XAF',
            recipientName: 'Test Recipient',
            recipientPhone: '+237600000000'
          })
        });

        if (res.ok) {
          const trade = await res.json();
          console.log('Trade created:', trade.id);
          currentTradeId = trade.id;
          socket.emit('trade:join', trade.id);
          console.log('Joined trade room');
        } else {
          const err = await res.json();
          console.log('Failed:', err.message || err.error);
        }
        break;
      }

      case '8': {
        console.log('Current trade room:', currentTradeId || 'None');
        break;
      }

      case 'q':
      case 'quit':
      case 'exit': {
        console.log('\nGoodbye!');
        socket.disconnect();
        rl.close();
        process.exit(0);
      }

      default:
        showMenu();
    }

    // Prompt for next command
    const nextCmd = await question('\n> ');
    handleCommand(nextCmd);
  }

  // Start command loop
  const firstCmd = await question('\n> ');
  handleCommand(firstCmd);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
