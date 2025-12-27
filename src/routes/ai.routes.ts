import { Router } from 'express'
import { aiGenerate, checkAiHealth } from '../services/ai.service'
import { verifyKeycloakToken } from '../middleware/keycloak-auth'
import axios from 'axios'

const router = Router()

// Protected route for AI generation
router.post('/generate', verifyKeycloakToken, async (req, res) => {
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
