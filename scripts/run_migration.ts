import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables FIRST
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const runMigration = async () => {
  console.log('Starting migration...');
  // Dynamic import to ensure env vars are loaded
  const { query } = await import('../src/config/database');

  try {
    // Add joining_date column
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS joining_date TIMESTAMP;
    `);
    console.log('Added joining_date column.');

    // Backfill existing users with created_at date
    await query(`
      UPDATE users 
      SET joining_date = created_at 
      WHERE joining_date IS NULL;
    `);
    console.log('Backfilled joining_date for existing users.');

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    const errorLog = JSON.stringify(error, null, 2) + '\n' + (error instanceof Error ? error.stack : '');
    fs.writeFileSync('migration_error.txt', errorLog);
    console.error('Migration failed. Details written to migration_error.txt');
    process.exit(1);
  }
};

runMigration();
