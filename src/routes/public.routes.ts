import { Router } from 'express'
import {
    generateMixedQuestionsPDF,
    generateMixedAnswerKey
} from '../controllers/question.controller'

const router = Router()

// Public routes for PDF generation (no authentication required)
router.post('/generate-mixed-pdf', generateMixedQuestionsPDF)
router.post('/generate-mixed-answer-key', generateMixedAnswerKey)

export default router
