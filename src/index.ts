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
import publicRoutes from './routes/public.routes'
import teacherRoutes from './routes/teacher.routes'
import studentRoutes from './routes/student.routes'
import adminRoutes from './routes/admin.routes'
import attendanceRoutes from './routes/attendance.routes'
import exportRoutes from './routes/export.routes'
import passwordResetRoutes from './routes/password-reset.routes'
import bulkImportRoutes from './routes/bulk-import.routes'
import curriculumRoutes from './routes/curriculum.routes'
import aiRoutes from './routes/ai.routes'
import homeworkRoutes from './routes/homework.routes'
import resultsRoutes from './routes/results.routes'
import materialsRoutes from './routes/materials.routes'
import announcementsRoutes from './routes/announcements.routes'
import questionRoutes from './routes/question.routes'
import { checkAiHealth } from './services/ai.service'

const app: Application = express()
const PORT = Number(process.env.PORT) || 3001

// Middleware
app.use(helmet())
// Allow all origins in development for mobile device testing
// In production, allow configured origins including api.sikhsha.in
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') return callback(null, true)

    const allowedOrigins = [
      'https://api.sikhsha.in',
      'https://aidashboard.sikhsha.in',
    ]

    if (allowedOrigins.indexOf(origin) !== -1 || origin === process.env.CORS_ORIGIN) {
      return callback(null, true)
    }

    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }))

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/public', publicRoutes)
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
app.use('/api', homeworkRoutes)  // Homework routes (teacher/student)
app.use('/api', resultsRoutes)   // Results/exams routes (teacher/student)
app.use('/api', materialsRoutes) // Study materials routes (teacher/student)
app.use('/api', announcementsRoutes) // Announcements and notifications
app.use('/api/questions', questionRoutes) // Question generator (teacher/admin)

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
  logger.info(`Server restarted at ${new Date().toISOString()}`)
  logger.info(`Environment: ${process.env.NODE_ENV}`)
  logger.info(`Accessible at http://0.0.0.0:${PORT} (all network interfaces)`)
})

export default app
