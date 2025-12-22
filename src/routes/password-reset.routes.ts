import { Router } from 'express'
import {
    requestPasswordReset,
    verifyResetToken,
    resetPassword,
} from '../controllers/password-reset.controller'

const router = Router()

// Password reset routes (no authentication required)
router.post('/forgot-password', requestPasswordReset)
router.get('/verify-reset-token/:token', verifyResetToken)
router.post('/reset-password', resetPassword)

export default router
