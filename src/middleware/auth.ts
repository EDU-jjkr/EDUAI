import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from './error-handler'

export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    school_id?: string | null
    grade_level?: string | null
  }
}


export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')

    if (!token) {
      throw new AppError('No token provided', 401, 'NO_TOKEN')
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key'
    const decoded = jwt.verify(token, JWT_SECRET) as any
    req.user = decoded
    next()
  } catch (error) {
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'))
  }
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403, 'FORBIDDEN'))
    }

    next()
  }
}

export const requireSchool = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
  }

  if (!req.user.school_id) {
    return next(new AppError('School context required', 400, 'SCHOOL_REQUIRED'))
  }

  next()
}
