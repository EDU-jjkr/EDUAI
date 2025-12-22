import { Response, NextFunction } from 'express'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import bcrypt from 'bcrypt'
import crypto from 'crypto'

// Request password reset
export const requestPasswordReset = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body

        if (!email) {
            throw new AppError('Email is required', 400, 'EMAIL_REQUIRED')
        }

        // Find user
        const userResult = await query('SELECT * FROM users WHERE email = $1', [email])
        if (userResult.rows.length === 0) {
            // Don't reveal if user exists or not for security
            return res.json({
                message: 'If an account with that email exists, a password reset link has been sent.'
            })
        }

        const user = userResult.rows[0]

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetTokenExpires = new Date(Date.now() + 3600000) // 1 hour from now

        // Store token in database
        await query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [resetToken, resetTokenExpires, user.id]
        )

        // In production, send email here
        // For now, just log the token
        console.log(`Password reset token for ${email}: ${resetToken}`)
        console.log(`Reset URL: http://localhost:3000/reset-password?token=${resetToken}`)

        res.json({
            message: 'If an account with that email exists, a password reset link has been sent.',
            // Include token in development for testing
            ...(process.env.NODE_ENV === 'development' && { token: resetToken })
        })
    } catch (error) {
        next(error)
    }
}

// Verify reset token
export const verifyResetToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { token } = req.params

        if (!token) {
            throw new AppError('Token is required', 400, 'TOKEN_REQUIRED')
        }

        const result = await query(
            'SELECT id, email FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
        )

        if (result.rows.length === 0) {
            throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN')
        }

        res.json({
            valid: true,
            email: result.rows[0].email
        })
    } catch (error) {
        next(error)
    }
}

// Reset password
export const resetPassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { token, newPassword } = req.body

        if (!token || !newPassword) {
            throw new AppError('Token and new password are required', 400, 'MISSING_FIELDS')
        }

        if (newPassword.length < 6) {
            throw new AppError('Password must be at least 6 characters', 400, 'PASSWORD_TOO_SHORT')
        }

        // Find user with valid token
        const result = await query(
            'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
        )

        if (result.rows.length === 0) {
            throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN')
        }

        const userId = result.rows[0].id

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password and clear reset token
        await query(
            'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
            [hashedPassword, userId]
        )

        res.json({ message: 'Password reset successful' })
    } catch (error) {
        next(error)
    }
}
