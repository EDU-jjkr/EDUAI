import { Response, NextFunction } from 'express'
import axios from 'axios'
import { AuthRequest } from '../middleware/auth'
import { AppError } from '../middleware/error-handler'
import logger from '../utils/logger'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'

interface QuestionRequest {
    subject: string
    chapter: string
    difficulty: string
    type: string
    count: number
    classLevel: string
    board?: string
    examMode?: string
    extraCommands?: string
    title?: string
    provider?: 'gemini' | 'openai'
    includeAnswers?: boolean
    includeExplanations?: boolean
}

interface GeneratedQuestion {
    question: string
    type: string
    options?: string[]
    correct_answer: string | string[]
    explanation?: string
    difficulty: string
}

// Generate questions using AI
export const generateQuestions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            subject,
            chapter,
            difficulty = 'medium',
            type = 'multiple-choice',
            count = 5,
            classLevel,
            board,
            examMode,
            extraCommands,
            provider = 'openai',
            includeAnswers = true,
            includeExplanations = true
        } = req.body as QuestionRequest

        // Validation
        if (!subject || !chapter || !classLevel) {
            throw new AppError('Subject, chapter, and classLevel are required', 400, 'MISSING_FIELDS')
        }

        if (count < 1 || count > 20) {
            throw new AppError('Count must be between 1 and 20', 400, 'INVALID_COUNT')
        }

        logger.info(`Generating ${count} ${type} questions for ${subject} - ${chapter}`)

        // Call AI service for question generation
        const aiResponse = await axios.post(
            `${AI_SERVICE_URL}/api/questions/generate`,
            {
                subject,
                chapter,
                difficulty,
                type,
                count,
                class_level: classLevel,
                board,
                exam_mode: examMode,
                extra_commands: extraCommands,
                provider,
                include_answers: includeAnswers,
                include_explanations: includeExplanations
            },
            {
                timeout: 60000, // 60 seconds for AI generation
                headers: { 'Content-Type': 'application/json' }
            }
        )

        const questions: GeneratedQuestion[] = aiResponse.data.questions || []

        res.json({
            questions,
            metadata: {
                subject,
                chapter,
                difficulty,
                type,
                count: questions.length,
                classLevel,
                generatedAt: new Date().toISOString()
            }
        })
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNREFUSED') {
                logger.error('AI service is not available')
                return next(new AppError('AI service is currently unavailable. Please try again later.', 503, 'AI_SERVICE_UNAVAILABLE'))
            }
            if (error.response) {
                logger.error(`AI service error: ${error.response.status}`, error.response.data)
                return next(new AppError(
                    error.response.data?.detail || 'AI service error',
                    error.response.status,
                    'AI_SERVICE_ERROR'
                ))
            }
        }
        next(error)
    }
}

// Create PDF from questions (placeholder - uses jsPDF in backend)
export const createPdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { questions, subject, chapter, difficulty, customTitle, includeAnswers, includeExplanations } = req.body

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
            throw new AppError('Questions array is required', 400, 'MISSING_QUESTIONS')
        }

        // For now, return a structured response that mobile can use
        // Full PDF generation would require jsPDF setup
        const title = customTitle || `${subject} - ${chapter} Questions`

        res.json({
            success: true,
            message: 'PDF generation queued',
            data: {
                title,
                questionCount: questions.length,
                subject,
                chapter,
                difficulty,
                includeAnswers,
                includeExplanations,
                // In a full implementation, this would be a download URL
                downloadUrl: null
            }
        })
    } catch (error) {
        next(error)
    }
}
