// Question routes - PDF endpoints are public for direct downloads
import { Router, NextFunction } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import axios from 'axios'
import { AppError } from '../middleware/error-handler'
import {
    generateQuestions,
    generateMixedQuestions,
    generateMixedQuestionsPDF,
    generateMixedAnswerKey
} from '../controllers/question.controller'

const router = Router()

// Get QUESTION_GENERATOR_URL from environment
const QUESTION_GENERATOR_URL = process.env.QUESTION_GENERATOR_URL || 'http://127.0.0.1:5000'

// JSON endpoints require authentication and teacher role
router.post('/generate', authenticate, authorize('teacher', 'admin'), generateQuestions)
router.post('/generate-mixed', authenticate, authorize('teacher', 'admin'), generateMixedQuestions)

// Curriculum endpoints - proxy to TOOL backend
router.get('/curriculum/classes', authenticate, async (req, res, next) => {
    try {
        const response = await axios.get(`${QUESTION_GENERATOR_URL}/api/v1/curriculum/classes`)
        res.json(response.data)
    } catch (error: any) {
        next(error)
    }
})

router.get('/curriculum/subjects', authenticate, async (req, res, next) => {
    try {
        const { class: classLevel } = req.query
        const response = await axios.get(`${QUESTION_GENERATOR_URL}/api/v1/curriculum/subjects`, {
            params: { class: classLevel }
        })
        res.json(response.data)
    } catch (error: any) {
        next(error)
    }
})

router.get('/curriculum/topics', authenticate, async (req, res, next) => {
    try {
        const { class: classLevel, subject } = req.query
        const response = await axios.get(`${QUESTION_GENERATOR_URL}/api/v1/curriculum/topics`, {
            params: { class: classLevel, subject }
        })
        res.json(response.data)
    } catch (error: any) {
        next(error)
    }
})

// PDF generation endpoints
router.post('/generate-pdf', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
    // Legacy support or direct proxy if needed, but generateQuestions can handle it.
    // Let's use a dedicated proxy for PDF to ensure arraybuffer response type
    try {
        const response = await axios.post(`${QUESTION_GENERATOR_URL}/api/v1/questions/generate-pdf`, req.body, {
            responseType: 'arraybuffer'
        })
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'attachment; filename=questions.pdf')
        res.send(response.data)
    } catch (error: any) {
        if (error.response) {
            return next(new AppError('PDF generation failed: ' + (error.response.data?.message || 'Tool backend error'), error.response.status))
        }
        next(error)
    }
})

router.post('/generate-mixed-pdf', authenticate, authorize('teacher', 'admin'), generateMixedQuestionsPDF)
router.post('/generate-mixed-answer-key', authenticate, authorize('teacher', 'admin'), generateMixedAnswerKey)

// PDF endpoints moved to public.routes.ts
// router.post('/generate-mixed-pdf-public', generateMixedQuestionsPDF)
// router.post('/generate-mixed-answer-key-public', generateMixedAnswerKey)

export default router
