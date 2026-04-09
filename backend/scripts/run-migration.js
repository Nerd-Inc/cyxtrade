const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const migrationFile = path.join(__dirname, '..', 'migrations', '001_unified_schema.sql');

  if (!fs.existsSync(migrationFile)) {
    console.error('Migration file not found:', migrationFile);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, 'utf8');

  console.log('🚀 Running migration: 001_unified_schema.sql');
  console.log('─'.repeat(50));

  // Split by semicolon but be careful with functions/triggers (which have $$ blocks)
  // Simple approach: split on semicolons followed by newlines
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.match(/^--/));

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const statement of statements) {
    // Skip pure comments
    if (!statement || statement.match(/^--/) || statement.match(/^\/\*/)) continue;

    try {
      await pool.query(statement);
      successCount++;

      // Log table/index creations
      const match = statement.match(/CREATE\s+(TABLE|INDEX|EXTENSION|TYPE|FUNCTION|TRIGGER)\s+(?:IF NOT EXISTS\s+)?["`]?(\w+)["`]?/i);
      if (match) {
        console.log(`  ✅ Created ${match[1].toLowerCase()}: ${match[2]}`);
      }
    } catch (err) {
      const isDuplicate = ['42P07', '42710', '42P16', '42701'].includes(err.code);
      const isNotFound = ['42P01', '42703'].includes(err.code);

      if (isDuplicate) {
        skipCount++;
        const match = statement.match(/CREATE\s+(TABLE|INDEX|TYPE)\s+(?:IF NOT EXISTS\s+)?["`]?(\w+)["`]?/i);
        if (match) console.log(`  ⏭️  Exists: ${match[2]}`);
      } else if (isNotFound) {
        skipCount++;
      } else {
        errorCount++;
        // Show first 80 chars of statement for context
        const preview = statement.substring(0, 80).replace(/\n/g, ' ');
        console.log(`  ⚠️  ${err.code || 'ERR'}: ${err.message.split('\n')[0]} [${preview}...]`);
      }
    }
  }

  await pool.end();

  console.log('─'.repeat(50));
  console.log(`✅ Migration completed: ${successCount} success, ${skipCount} skipped, ${errorCount} errors`);
}

runMigration();
