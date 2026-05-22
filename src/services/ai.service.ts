import axios from 'axios'
import logger from '../utils/logger'

// Get config from environment - DO NOT HARDCODE localhost!
const AI_BASE_URL = process.env.AI_SERVICE_URL
const AI_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '15000', 10)

// Create axios client with config
const aiClient = axios.create({
    baseURL: AI_BASE_URL,
    timeout: AI_TIMEOUT
})

export interface AIResponse<T = any> {
    success: boolean
    data?: T
    message?: string
}

export interface AIBinaryResponse {
    success: boolean
    data?: Buffer
    headers?: Record<string, string | undefined>
    message?: string
}

export interface AIRequest {
    route?: string
    payload?: any
}

/**
 * Make AI generation request with graceful failure handling.
 * Never throws - always returns an AIResponse object.
 */
export async function aiGenerate(request: AIRequest): Promise<AIResponse> {
    if (!AI_BASE_URL) {
        logger.warn('AI service not configured (AI_SERVICE_URL missing)')
        return {
            success: false,
            message: 'AI service not configured'
        }
    }

    if (!request?.route) {
        return {
            success: false,
            message: 'AI route is required'
        }
    }

    try {
        const res = await aiClient.post(request.route, request.payload ?? {})
        return {
            success: true,
            data: res.data
        }
    } catch (err: any) {
        logger.error('AI Service Error:', err.message)

        // Return graceful failure - NEVER crash the backend
        if (err.code === 'ECONNREFUSED') {
            return {
                success: false,
                message: 'AI service connection refused. Is it running?'
            }
        }
        if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
            return {
                success: false,
                message: 'AI service request timed out'
            }
        }
        if (err.response?.status === 503) {
            return {
                success: false,
                message: 'AI service temporarily unavailable'
            }
        }

        return {
            success: false,
            message: err.message || 'AI service error occurred'
        }
    }
}

export async function aiGenerateBinary(request: AIRequest): Promise<AIBinaryResponse> {
    if (!AI_BASE_URL) {
        logger.warn('AI service not configured (AI_SERVICE_URL missing)')
        return {
            success: false,
            message: 'AI service not configured'
        }
    }

    if (!request?.route) {
        return {
            success: false,
            message: 'AI route is required'
        }
    }

    try {
        const res = await aiClient.post(request.route, request.payload ?? {}, {
            responseType: 'arraybuffer'
        })
        return {
            success: true,
            data: Buffer.from(res.data),
            headers: {
                'content-type': res.headers['content-type'],
                'content-disposition': res.headers['content-disposition'],
            }
        }
    } catch (err: any) {
        logger.error('AI Service Binary Error:', err.message)

        if (err.code === 'ECONNREFUSED') {
            return {
                success: false,
                message: 'AI service connection refused. Is it running?'
            }
        }
        if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
            return {
                success: false,
                message: 'AI service request timed out'
            }
        }
        if (err.response?.status === 503) {
            return {
                success: false,
                message: 'AI service temporarily unavailable'
            }
        }

        return {
            success: false,
            message: err.message || 'AI service error occurred'
        }
    }
}

/**
 * Check if AI service is healthy.
 * Returns true/false - never throws.
 */
export async function checkAiHealth(): Promise<boolean> {
    if (!AI_BASE_URL) return false

    try {
        await aiClient.get('/health')
        return true
    } catch (error) {
        return false
    }
}

