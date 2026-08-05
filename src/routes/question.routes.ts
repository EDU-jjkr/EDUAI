// Question routes - PDF endpoints are public for direct downloads
import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import axios from 'axios'
import { AppError } from '../middleware/error-handler'
import {
  generateQuestions,
  generateMixedQuestions,
  generateMixedQuestionsPDF,
  generateMixedAnswerKey,
} from '../controllers/question.controller'
import {
  getAllClasses,
  getSubjectsByClass,
  getChaptersBySubject,
} from '../services/curriculum'

const router = Router()

// Get QUESTION_GENERATOR_URL from environment
const QUESTION_GENERATOR_URL =
  process.env.QUESTION_GENERATOR_URL || 'http://127.0.0.1:5000'

// JSON endpoints require authentication and teacher role
router.post(
  '/generate',
  authenticate,
  authorize('teacher', 'admin'),
  generateQuestions,
)
router.post(
  '/generate-mixed',
  authenticate,
  authorize('teacher', 'admin'),
  generateMixedQuestions,
)

// Curriculum endpoints - proxy to TOOL backend with local fallback
router.get('/curriculum/classes', authenticate, async (req, res, next) => {
  try {
    const response = await axios.get(
      `${QUESTION_GENERATOR_URL}/api/v1/curriculum/classes`,
      { timeout: 3000 },
    )
    return res.json(response.data)
  } catch (error: any) {
    try {
      const classesList = getAllClasses().map(c => String(c))
      return res.json({ classes: classesList })
    } catch (fallbackErr) {
      return next(error)
    }
  }
})

router.get('/curriculum/subjects', authenticate, async (req, res, next) => {
  try {
    const { class: classLevel } = req.query
    const response = await axios.get(
      `${QUESTION_GENERATOR_URL}/api/v1/curriculum/subjects`,
      {
        params: { class: classLevel },
        timeout: 3000,
      },
    )
    return res.json(response.data)
  } catch (error: any) {
    try {
      const classStr =
        (req.query.class as string) ||
        (req.query.classLevel as string) ||
        '10'
      const classNum = parseInt(classStr.replace(/[^0-9]/g, ''), 10) || 10
      const subjectsList = getSubjectsByClass(classNum)
      const subjects = subjectsList.map(s => ({ id: s, name: s }))
      return res.json({ subjects })
    } catch (fallbackErr) {
      return next(error)
    }
  }
})

router.get('/curriculum/topics', authenticate, async (req, res, next) => {
  try {
    const { class: classLevel, subject } = req.query
    const response = await axios.get(
      `${QUESTION_GENERATOR_URL}/api/v1/curriculum/topics`,
      {
        params: { class: classLevel, subject },
        timeout: 3000,
      },
    )
    return res.json(response.data)
  } catch (error: any) {
    try {
      const classStr =
        (req.query.class as string) ||
        (req.query.classLevel as string) ||
        '10'
      const classNum = parseInt(classStr.replace(/[^0-9]/g, ''), 10) || 10
      const subjectStr = (req.query.subject as string) || 'Mathematics'
      const chapters = getChaptersBySubject(classNum, subjectStr)

      const topicNames: string[] = []
      for (const ch of chapters) {
        if (ch.topics && ch.topics.length > 0) {
          for (const tp of ch.topics) {
            topicNames.push(`${ch.name}: ${tp.name}`)
          }
        } else {
          topicNames.push(ch.name)
        }
      }

      return res.json({
        topics: topicNames.length > 0 ? topicNames : [subjectStr],
        subject: subjectStr,
        classLevel: classStr,
      })
    } catch (fallbackErr) {
      return next(error)
    }
  }
})

// PDF generation endpoints
router.post(
  '/generate-pdf',
  authenticate,
  authorize('teacher', 'admin'),
  async (req, res, next) => {
    try {
      const response = await axios.post(
        `${QUESTION_GENERATOR_URL}/api/v1/questions/generate-pdf`,
        req.body,
        {
          responseType: 'arraybuffer',
          timeout: 60000,
        },
      )
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=questions.pdf',
      )
      res.send(response.data)
    } catch (error: any) {
      if (error.response) {
        return next(
          new AppError(
            'PDF generation failed: ' +
              (error.response.data?.message || 'Tool backend error'),
            error.response.status,
          ),
        )
      }
      if (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND'
      ) {
        return next(
          new AppError(
            'Question Generator service is unavailable.',
            503,
            'SERVICE_UNAVAILABLE',
          ),
        )
      }
      next(error)
    }
  },
)

router.post(
  '/generate-mixed-pdf',
  authenticate,
  authorize('teacher', 'admin'),
  generateMixedQuestionsPDF,
)
router.post(
  '/generate-mixed-answer-key',
  authenticate,
  authorize('teacher', 'admin'),
  generateMixedAnswerKey,
)

export default router
