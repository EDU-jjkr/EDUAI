import { Response, NextFunction } from 'express'
import { validationResult } from 'express-validator'
import bcrypt from 'bcrypt'
import jwt, { SignOptions } from 'jsonwebtoken'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password, name, role, school_id, grade_level, subjects_teaching, section } = req.body

    // Validation: grade_level required for students
    if (role === 'student' && !grade_level) {
      throw new AppError('Grade level is required for students', 400, 'GRADE_LEVEL_REQUIRED')
    }

    // Check if user already exists
    const existingUser = await query('SELECT * FROM users WHERE email = $1', [email])
    if (existingUser.rows.length > 0) {
      throw new AppError('User already exists', 400, 'USER_EXISTS')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user with section
    const result = await query(
      `INSERT INTO users (email, password, name, role, school_id, grade_level, subjects_teaching, section, profile_completed) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING id, email, name, role, school_id, grade_level, subjects_teaching, section, created_at`,
      [
        email,
        hashedPassword,
        name,
        role,
        school_id || null,
        role === 'student' ? grade_level : null,
        role === 'teacher' && subjects_teaching ? JSON.stringify(subjects_teaching) : null,
        role === 'student' ? section : null,
        true // profile_completed
      ]
    )

    const user = result.rows[0]

    // Generate JWT (include school_id and grade_level)
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id,
      grade_level: user.grade_level,
    }
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any }
    const token = jwt.sign(payload, JWT_SECRET, options)

    res.status(201).json({ user, token })
  } catch (error) {
    next(error)
  }
}

export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    // Find user
    const result = await query('SELECT * FROM users WHERE email = $1', [email])
    if (result.rows.length === 0) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    const user = result.rows[0]

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    // Generate JWT
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id,
      grade_level: user.grade_level
    }
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any }
    const token = jwt.sign(payload, JWT_SECRET, options)

    // Remove password from response
    delete user.password

    res.json({ user, token })
  } catch (error) {
    next(error)
  }
}

export const refreshToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body

    if (!token) {
      throw new AppError('Token required', 400, 'TOKEN_REQUIRED')
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any

    const payload = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      school_id: decoded.school_id,
      grade_level: decoded.grade_level,
    }
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any }
    const newToken = jwt.sign(payload, JWT_SECRET, options)

    res.json({ token: newToken })
  } catch (error) {
    next(new AppError('Invalid token', 401, 'INVALID_TOKEN'))
  }
}

export const logout = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // In a real implementation, you might want to blacklist the token
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    next(error)
  }
}
