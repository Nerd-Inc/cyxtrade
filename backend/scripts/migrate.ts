import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration(filename: string) {
  const filePath = path.join(__dirname, '..', 'migrations', filename);

  if (!fs.existsSync(filePath)) {
    console.error(`Migration file not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  console.log(`Running migration: ${filename}`);
  console.log('─'.repeat(50));

  try {
    await pool.query(sql);
    console.log(`✓ Migration ${filename} completed successfully`);
  } catch (error: any) {
    console.error(`✗ Migration failed: ${error.message}`);
    // Show more detail for debugging
    if (error.detail) console.error(`  Detail: ${error.detail}`);
    if (error.hint) console.error(`  Hint: ${error.hint}`);
    process.exit(1);
  }
}

async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.log('Usage: npx ts-node scripts/migrate.ts <migration_file>');
    console.log('');
    console.log('Available migrations:');
    const migrations = fs.readdirSync(path.join(__dirname, '..', 'migrations'))
      .filter(f => f.endsWith('.sql'))
      .sort();
    migrations.forEach(m => console.log(`  - ${m}`));
    process.exit(0);
  }

  await runMigration(migrationFile);
  await pool.end();
}

main();
