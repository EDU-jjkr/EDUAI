import { Pool } from 'pg'
import logger from '../utils/logger'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err)
  // process.exit(-1) - Don't crash the app on idle client errors
})

export const query = async (text: string, params?: any[]) => {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    logger.debug('Executed query', { text, duration, rows: res.rowCount })
    return res
  } catch (error) {
    logger.error('Query error', { text, error })
    throw error
  }
}

export default pool
