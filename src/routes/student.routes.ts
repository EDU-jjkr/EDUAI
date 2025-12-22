import { Router } from 'express'
import { body } from 'express-validator'
import multer from 'multer'
import { authenticate, authorize, requireSchool } from '../middleware/auth'
import * as studentController from '../controllers/student.controller'

const router = Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
})

// All routes require student authentication
router.use(authenticate)
router.use(authorize('student', 'admin'))

// Doubt Solver - Text Input (no school required - it's a personal feature)
router.post(
  '/doubt/text',
  [body('question').trim().notEmpty(), body('subject').optional().trim()],
  studentController.submitTextDoubt
)

// Doubt Solver - Image Upload (no school required)
router.post(
  '/doubt/image',
  upload.single('image'),
  studentController.submitImageDoubt
)

// Doubt Solver - Voice Input (no school required)
router.post(
  '/doubt/voice',
  upload.single('audio'),
  studentController.submitVoiceDoubt
)

// Get doubt history (no school required)
router.get('/doubts', studentController.getDoubtHistory)

// Get specific doubt (no school required)
router.get('/doubt/:id', studentController.getDoubtById)

// Submit follow-up question (no school required)
router.post(
  '/doubt/:id/follow-up',
  [body('question').trim().notEmpty()],
  studentController.submitFollowUp
)

// Get weak areas (no school required)
router.get('/weak-areas', studentController.getWeakAreas)

// Get similar problems (no school required)
router.get('/doubt/:id/similar', studentController.getSimilarProblems)

export default router
