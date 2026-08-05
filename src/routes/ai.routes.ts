import { Router } from 'express'
import { aiGenerate, aiGenerateBinary, checkAiHealth } from '../services/ai.service'
import { authenticate } from '../middleware/auth'
import axios from 'axios'

const router = Router()

// Protected route for AI generation
router.post('/generate', authenticate, async (req, res) => {
    try {
        const result = await aiGenerate(req.body)
        res.json(result)
    } catch (err: any) {
        console.error('AI Generate Error:', err)
        res.status(503).json({
            error: err.message || 'AI temporarily unavailable'
        })
    }
})

router.post('/pptx', authenticate, async (req, res) => {
    const result = await aiGenerateBinary({
        route: '/api/deck/generate-deck-pptx',
        payload: req.body,
    })

    if (!result.success || !result.data) {
        return res.status(503).json({
            error: result.message || 'AI temporarily unavailable'
        })
    }

    res.setHeader(
        'Content-Type',
        result.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    )
    if (result.headers?.['content-disposition']) {
        res.setHeader('Content-Disposition', result.headers['content-disposition'])
    }
    res.send(result.data)
})

// Public health check for AI service availability
router.get('/health', async (req, res) => {
    const isUp = await checkAiHealth()
    if (isUp) {
        res.json({ ai: 'up' })
    } else {
        res.status(503).json({ ai: 'down' })
    }
})

export default router
