import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables FIRST
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const runMigration = async () => {
    console.log('Starting topic generator migration...');
    // Dynamic import to ensure env vars are loaded
    const { query } = await import('../src/config/database');

    try {
        // Read the migration file
        const migrationPath = path.resolve(__dirname, '../migrations/add_topic_generator.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Execute the migration
        await query(migrationSQL);
        console.log('Topic generator tables created successfully.');

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        const errorLog = JSON.stringify(error, null, 2) + '\n' + (error instanceof Error ? error.stack : '');
        fs.writeFileSync('topic_migration_error.txt', errorLog);
        console.error('Migration failed. Details written to topic_migration_error.txt');
        console.error(error);
        process.exit(1);
    }
};

runMigration();
