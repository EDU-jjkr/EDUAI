import { Response, NextFunction } from 'express'
import { AppError } from './error-handler'
import type { AuthRequest } from './auth'

/**
 * Middleware that enforces multi-tenant data isolation.
 *
 * Behaviour:
 *  - super_admin  → can access any school; optionally pass ?school_id= to scope
 *  - admin/teacher/student → must have school_id in JWT; injected into req.tenantId
 *
 * Usage:
 *   router.get('/users', authenticate, scopeToSchool, handler)
 */
export const scopeToSchool = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'))
  }

  const { role, school_id } = req.user

  // Super-admins bypass tenant scoping but can optionally scope to a school
  if (role === 'super_admin') {
    // Allow super-admin to target a specific school via query param or body
    const targetSchool = (req.query.school_id as string) || (req.body?.school_id as string)
    req.tenantId = targetSchool || null // null = all schools (super-admin view)
    return next()
  }

  // All other roles must have a valid school_id in their token
  if (!school_id) {
    return next(new AppError('School context is required. Please login again.', 400, 'SCHOOL_REQUIRED'))
  }

  req.tenantId = school_id
  next()
}

/**
 * Enforce that a school account is active.
 * Must be used AFTER scopeToSchool.
 */
export const requireActiveSchool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.tenantId) return next() // super-admin without school scope — allow

  try {
    const { query } = await import('../config/database')
    const schoolResult = await query(
      'SELECT is_active FROM schools WHERE id = $1',
      [req.tenantId]
    )

    if (schoolResult.rows.length === 0) {
      return next(new AppError('School not found', 404, 'SCHOOL_NOT_FOUND'))
    }

    if (!schoolResult.rows[0].is_active) {
      return next(new AppError('School account is suspended. Contact support.', 403, 'SCHOOL_SUSPENDED'))
    }

    next()
  } catch (error) {
    next(error)
  }
}

/**
 * Utility: build a school-scoped WHERE clause fragment.
 * Returns both the SQL fragment and updated params array.
 *
 * @example
 *   const { clause, params } = buildTenantClause(req, [], 1)
 *   // clause = 'school_id = $1', params = [req.tenantId]
 */
export const buildTenantClause = (
  req: AuthRequest,
  existingParams: any[],
  nextIndex: number
): { clause: string; params: any[]; nextIndex: number } => {
  if (!req.tenantId) {
    // super_admin without scope → no restriction
    return { clause: '1=1', params: existingParams, nextIndex }
  }

  return {
    clause: `school_id = $${nextIndex}`,
    params: [...existingParams, req.tenantId],
    nextIndex: nextIndex + 1
  }
}
