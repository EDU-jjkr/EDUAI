import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth'
import * as questionsController from '../controllers/questions.controller'

const router = Router()

// Question generation requires authentication (teacher or admin)
router.use(authenticate)
router.use(authorize('teacher', 'admin'))

// Generate questions using AI
router.post(
    '/generate',
    [
        body('subject').trim().notEmpty().withMessage('Subject is required'),
        body('chapter').trim().notEmpty().withMessage('Chapter is required'),
        body('classLevel').trim().notEmpty().withMessage('Class level is required'),
        body('count').optional().isInt({ min: 1, max: 100 }).withMessage('Count must be 1-100'),
        body('difficulty').optional().isIn(['easy', 'medium', 'hard']).withMessage('Invalid difficulty'),
        body('type').optional().isIn(['multiple-choice', 'short-answer', 'true-false', 'long-answer']).withMessage('Invalid type'),
    ],
    questionsController.generateQuestions
)

// Create PDF from questions
router.post(
    '/create-pdf',
    [
        body('questions').isArray({ min: 1 }).withMessage('Questions array is required'),
        body('subject').trim().notEmpty().withMessage('Subject is required'),
        body('chapter').trim().notEmpty().withMessage('Chapter is required'),
    ],
    questionsController.createPdf
)

export default router
