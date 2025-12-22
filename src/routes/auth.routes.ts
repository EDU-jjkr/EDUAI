import { Router } from 'express'
import { body } from 'express-validator'
import * as authController from '../controllers/auth.controller'

const router = Router()

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('role').isIn(['teacher', 'student', 'admin']),
  ],
  authController.register
)

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  authController.login
)

router.post('/refresh', authController.refreshToken)

router.post('/logout', authController.logout)

export default router
