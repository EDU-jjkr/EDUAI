import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger'

export interface CustomError extends Error {
  status?: number
  code?: string
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err.status || 500
  const message = err.message || 'Internal Server Error'
  
  logger.error(`Error: ${message}`, {
    status,
    code: err.code,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  })

  res.status(status).json({
    error: {
      message,
      code: err.code,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  })
}

export class AppError extends Error implements CustomError {
  status: number
  code?: string

  constructor(message: string, status: number = 500, code?: string) {
    super(message)
    this.status = status
    this.code = code
    Error.captureStackTrace(this, this.constructor)
  }
}
