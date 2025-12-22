// Quick test script to verify database connection
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
    console.log('Testing database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'NOT SET ✗');

    try {
        // Test basic connection
        const client = await pool.connect();
        console.log('✓ Connected to database successfully!');

        // Check if users table exists
        const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

        console.log('\n📊 Tables in database:');
        if (result.rows.length === 0) {
            console.log('❌ NO TABLES FOUND!');
            console.log('\n⚠️  You need to run the schema.sql file in Supabase SQL Editor');
            console.log('   1. Go to https://supabase.com');
            console.log('   2. Open SQL Editor');
            console.log('   3. Copy/paste contents of database/schema.sql');
            console.log('   4. Click Run');
        } else {
            result.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.table_name}`);
            });
            console.log('\n✓ Database schema is set up correctly!');
        }

        client.release();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Database connection failed!');
        console.error('\nFull error details:');
        console.error(error);
        console.error('\nPossible issues:');
        console.error('1. DATABASE_URL is incorrect or malformed');
        console.error('2. Supabase project is paused (check https://supabase.com)');
        console.error('3. Network/firewall issues blocking connection');
        console.error('4. Database password contains special characters that need URL encoding');
        process.exit(1);
    }
}

testConnection();
