// Direct test with the credentials provided by user
require('dotenv').config();
const { Pool } = require('pg');

// Test with exact connection string
const testConnectionString = 'postgresql://postgres:4azyQ6hv4Wf9vint@db.lyvtxvgadziiyvyvddfq.supabase.co:5432/postgres';

console.log('Testing database connection with provided credentials...');
console.log('Connection string format: postgresql://postgres:****@db.lyvtxvgadziiyvyvddfq.supabase.co:5432/postgres\n');

const pool = new Pool({
    connectionString: testConnectionString,
});

async function testConnection() {
    try {
        console.log('Attempting to connect...');
        const client = await pool.connect();
        console.log('✅ Connected successfully!\n');

        // Test a simple query
        const result = await client.query('SELECT NOW()');
        console.log('Database time:', result.rows[0].now);

        // Check for tables
        const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

        console.log('\n📊 Tables in database:');
        if (tables.rows.length === 0) {
            console.log('⚠️  No tables found - you need to run schema.sql');
        } else {
            tables.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.table_name}`);
            });
        }

        client.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed!\n');
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);

        if (error.code === 'ENOTFOUND') {
            console.error('\n🔴 DNS Resolution Error');
            console.error('The hostname cannot be found by your DNS server.');
            console.error('\nPossible causes:');
            console.error('1. Network connectivity issue');
            console.error('2. DNS server issue');
            console.error('3. Firewall blocking the connection');
            console.error('4. VPN interfering with connection');
            console.error('\nTry:');
            console.error('- Check your internet connection');
            console.error('- Try disabling VPN if you have one');
            console.error('- Flush DNS: ipconfig /flushdns');
            console.error('- Use connection pooler instead (see Supabase settings)');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('\n🔴 Connection Refused');
            console.error('Database server rejected the connection.');
        } else if (error.message && error.message.includes('password')) {
            console.error('\n🔴 Authentication Error');
            console.error('Password might be incorrect.');
        }

        process.exit(1);
    }
}

testConnection();
