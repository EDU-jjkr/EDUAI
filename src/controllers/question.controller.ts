import { Response, NextFunction } from 'express'
import axios from 'axios'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'

const QUESTION_GENERATOR_URL = process.env.QUESTION_GENERATOR_URL || 'http://127.0.0.1:5000'
console.log('[Question Controller] Using QUESTION_GENERATOR_URL:', QUESTION_GENERATOR_URL)

// Helper function to handle axios errors gracefully
const handleAxiosError = (error: any, next: NextFunction, defaultMessage: string, errorCode: string) => {
    console.log('[Question Controller] Error details:', {
        code: error.code,
        message: error.message,
        hasResponse: !!error.response,
        responseStatus: error.response?.status
    })

    if (error.response) {
        // Extract detailed error message from response
        const responseData = error.response.data
        let errorMessage = responseData?.message || responseData?.error || defaultMessage

        // If there are validation details, include them
        if (responseData?.details) {
            const details = responseData.details.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join(', ')
            errorMessage = `${errorMessage}: ${details}`
        }

        console.error('[Question Controller] Error from TOOL:', errorMessage)

        // Forward error from question generator
        return next(new AppError(
            errorMessage,
            error.response.status,
            errorCode
        ))
    }
    // Handle connection errors (service not available)
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.code === 'ERR_SOCKET_CONNECTION_TIMEOUT') {
        return next(new AppError(
            'Question Generator service is not available. Please try again later.',
            503,
            'SERVICE_UNAVAILABLE'
        ))
    }
    next(error)
}

// Generate single type questions
export const generateQuestions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            subject,
            chapter,
            difficulty,
            type,
            count,
            classLevel,
            extraCommands,
            title,
            provider
        } = req.body

        // Validate required fields
        if (!subject || !chapter || !difficulty || !type || !count || !classLevel) {
            return next(new AppError('Missing required fields', 400, 'MISSING_FIELDS'))
        }

        // Forward request to question generator service
        const response = await axios.post(
            `${QUESTION_GENERATOR_URL}/api/v1/questions/generate`,
            {
                subject,
                chapter,
                difficulty,
                type,
                count,
                classLevel,
                extraCommands,
                title,
                provider: provider || 'gemini'
            },
            {
                timeout: 480000 // 120 second timeout for AI generation
            }
        )

        res.json(response.data)
    } catch (error: any) {
        handleAxiosError(error, next, 'Question generation failed', 'QUESTION_GENERATION_ERROR')
    }
}

// Generate mixed questions
export const generateMixedQuestions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            subject,
            chapter,
            difficulty,
            classLevel,
            extraCommands,
            title,
            provider,
            questionTypes
        } = req.body

        // Validate required fields
        if (!subject || !chapter || !difficulty || !classLevel || !questionTypes) {
            return next(new AppError('Missing required fields', 400, 'MISSING_FIELDS'))
        }

        // Forward request to question generator service
        const response = await axios.post(
            `${QUESTION_GENERATOR_URL}/api/v1/questions/generate-mixed`,
            {
                subject,
                chapter,
                difficulty,
                classLevel,
                extraCommands,
                title,
                provider: provider || 'gemini',
                questionTypes
            },
            {
                timeout: 480000 // 480 second timeout for AI generation
            }
        )

        res.json(response.data)
    } catch (error: any) {
        handleAxiosError(error, next, 'Question generation failed', 'QUESTION_GENERATION_ERROR')
    }
}

// Generate mixed questions PDF
export const generateMixedQuestionsPDF = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            subject,
            chapter,
            difficulty,
            classLevel,
            extraCommands,
            customTitle,
            provider,
            questionTypes,
            includeAnswers,
            includeExplanations
        } = req.body

        // Forward request to question generator service
        const response = await axios.post(
            `${QUESTION_GENERATOR_URL}/api/v1/questions/generate-mixed-pdf`,
            {
                subject,
                chapter,
                difficulty,
                classLevel,
                extraCommands,
                customTitle,
                provider: provider || 'gemini',
                questionTypes,
                includeAnswers,
                includeExplanations
            },
            {
                responseType: 'arraybuffer',
                timeout: 90000 // 90 second timeout for PDF generation
            }
        )

        // Forward the PDF response
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', response.headers['content-disposition'] || 'attachment; filename=questions.pdf')
        res.send(Buffer.from(response.data))
    } catch (error: any) {
        handleAxiosError(error, next, 'PDF generation failed', 'PDF_GENERATION_ERROR')
    }
}

// Generate mixed answer key PDF
export const generateMixedAnswerKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            subject,
            chapter,
            difficulty,
            classLevel,
            extraCommands,
            customTitle,
            provider,
            questionTypes
        } = req.body

        // Forward request to question generator service
        const response = await axios.post(
            `${QUESTION_GENERATOR_URL}/api/v1/questions/generate-mixed-answer-key`,
            {
                subject,
                chapter,
                difficulty,
                classLevel,
                extraCommands,
                customTitle,
                provider: provider || 'gemini',
                questionTypes
            },
            {
                responseType: 'arraybuffer',
                timeout: 90000
            }
        )

        // Forward the PDF response
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', response.headers['content-disposition'] || 'attachment; filename=answer_key.pdf')
        res.send(Buffer.from(response.data))
    } catch (error: any) {
        handleAxiosError(error, next, 'Answer key generation failed', 'ANSWER_KEY_GENERATION_ERROR')
    }
}
