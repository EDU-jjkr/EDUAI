// Load environment variables FIRST before any other imports
import dotenv from 'dotenv'
dotenv.config()

import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { errorHandler } from './middleware/error-handler'
import logger from './utils/logger'

// Import routes
import authRoutes from './routes/auth.routes'
import teacherRoutes from './routes/teacher.routes'
import studentRoutes from './routes/student.routes'
import adminRoutes from './routes/admin.routes'
import attendanceRoutes from './routes/attendance.routes'
import exportRoutes from './routes/export.routes'
import passwordResetRoutes from './routes/password-reset.routes'
import bulkImportRoutes from './routes/bulk-import.routes'
import curriculumRoutes from './routes/curriculum.routes'
import aiRoutes from './routes/ai.routes'
import { checkAiHealth } from './services/ai.service'
import { verifyKeycloakToken, KeycloakAuthRequest } from './middleware/keycloak-auth'

const app: Application = express()
const PORT = Number(process.env.PORT) || 3001

// Middleware
app.use(helmet())
// Allow all origins in development for mobile device testing
const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN || 'http://localhost:3000')
  : '*' // Allow all origins in development
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }))

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Keycloak auth verification endpoint
app.get('/api/_auth-check', verifyKeycloakToken, (req: KeycloakAuthRequest, res: Response) => {
  res.json({
    ok: true,
    user: req.user
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/auth', passwordResetRoutes)
app.use('/api/teacher', teacherRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/users', bulkImportRoutes)
app.use('/api/attendance', attendanceRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/curriculum', curriculumRoutes)
app.use('/api/ai', aiRoutes)

// Internal AI health check
app.get('/internal/ai-health', async (req, res) => {
  const isUp = await checkAiHealth()
  if (isUp) res.json({ ai: 'up' })
  else res.status(503).json({ ai: 'down' })
})

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' })
})

// Error handler
app.use(errorHandler)

// Start server - listen on 0.0.0.0 to allow connections from mobile devices
app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running on port ${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV}`)
  logger.info(`Accessible at http://0.0.0.0:${PORT} (all network interfaces)`)
})

export default app
