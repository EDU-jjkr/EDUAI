import { query } from './src/config/database'
import bcrypt from 'bcrypt'

async function createSuperAdmin() {
  try {
    const email = 'master@erp.com'
    const password = 'SuperPassword@123'
    
    // Check if exists
    const existing = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length > 0) {
      console.log('Super-admin already exists: master@erp.com')
      process.exit(0)
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    
    await query(`
      INSERT INTO users (email, password, name, role, profile_completed)
      VALUES ($1, $2, 'Platform Master', 'super_admin', true)
    `, [email, hashedPassword])

    console.log('✅ Super-admin created successfully!')
    console.log('----------')
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
    console.log('----------')
    console.log('You can now log in and you will be redirected to the Super Admin Dashboard.')

  } catch (err) {
    console.error('Failed to create super-admin:', err)
  } finally {
    process.exit(0)
  }
}

createSuperAdmin()
