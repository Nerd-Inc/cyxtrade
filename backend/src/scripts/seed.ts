import { query } from '../services/db';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('Seeding database...\n');

  try {
    // Create test users
    console.log('Creating test users...');

    // Admin user
    const adminResult = await query(
      `INSERT INTO users (phone, display_name, is_admin, phone_verified)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (phone) DO UPDATE SET display_name = $2
       RETURNING *`,
      ['+971556522518', 'Admin User', true]
    );
    console.log('  - Admin:', adminResult[0]?.phone);

    // Test user
    const userResult = await query(
      `INSERT INTO users (phone, display_name, phone_verified)
       VALUES ($1, $2, true)
       ON CONFLICT (phone) DO UPDATE SET display_name = $2
       RETURNING *`,
      ['+237679109111', 'Test User', false]
    );
    const testUserId = userResult[0]?.id;
    console.log('  - User:', userResult[0]?.phone);

    // Trader users
    const traders = [
      { phone: '+971501234567', name: 'Mamadou Diallo', bondAmount: 2000 },
      { phone: '+971507654321', name: 'Ibrahim Sow', bondAmount: 1500 },
      { phone: '+971509999888', name: 'Fatou Kamara', bondAmount: 3000 },
    ];

    console.log('\nCreating traders...');
    for (const trader of traders) {
      // Create user
      const traderUserResult = await query(
        `INSERT INTO users (phone, display_name, is_trader, phone_verified)
         VALUES ($1, $2, true, true)
         ON CONFLICT (phone) DO UPDATE SET display_name = $2, is_trader = true
         RETURNING *`,
        [trader.phone, trader.name]
      );
      const traderUserId = traderUserResult[0]?.id;

      // Create trader profile
      const corridors = [
        { from: 'AED', to: 'XAF', buyRate: 163, sellRate: 160 },
      ];

      await query(
        `INSERT INTO traders (user_id, status, bond_amount, corridors, rating, total_trades, is_online, approved_at)
         VALUES ($1, 'active', $2, $3, $4, $5, true, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET status = 'active', bond_amount = $2, corridors = $3, is_online = true
         RETURNING *`,
        [
          traderUserId,
          trader.bondAmount,
          JSON.stringify(corridors),
          (4 + Math.random()).toFixed(1), // Random rating 4.0-5.0
          Math.floor(Math.random() * 50) + 10, // Random trades 10-60
        ]
      );

      console.log(`  - ${trader.name}: ${trader.bondAmount} AED bond`);
    }

    console.log('\nSeed completed successfully!');
    console.log('\nTest credentials:');
    console.log('  - Admin: +971556522518 (OTP: 123456)');
    console.log('  - User: +237679109111 (OTP: 123456)');
    console.log('\n3 traders are online and ready for testing.');

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seed();
