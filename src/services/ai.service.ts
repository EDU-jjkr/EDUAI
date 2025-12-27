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

/**
 * Make AI generation request with graceful failure handling.
 * Never throws - always returns an AIResponse object.
 */
export async function aiGenerate(payload: any): Promise<AIResponse> {
    if (!AI_BASE_URL) {
        logger.warn('AI service not configured (AI_SERVICE_URL missing)')
        return {
            success: false,
            message: 'AI service not configured'
        }
    }

    try {
        const res = await aiClient.post('/generate', payload)
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

