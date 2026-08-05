import { Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'

// ─────────────────────────────────────────────────────────────────
// School CRUD (Super-Admin only)
// ─────────────────────────────────────────────────────────────────

/** Create a new tenant school */
export const createSchool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, address, contact_email, contact_phone, subdomain, plan, max_students, max_teachers, logo_url } = req.body

    if (!name || !contact_email) {
      throw new AppError('School name and contact email are required', 400, 'MISSING_FIELDS')
    }

    // Check subdomain uniqueness
    if (subdomain) {
      const existing = await query('SELECT id FROM schools WHERE subdomain = $1', [subdomain])
      if (existing.rows.length > 0) {
        throw new AppError('Subdomain already taken', 409, 'SUBDOMAIN_TAKEN')
      }
    }

    const result = await query(
      `INSERT INTO schools (name, address, contact_email, contact_phone, subdomain, plan, max_students, max_teachers, logo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name,
        address || null,
        contact_email,
        contact_phone || null,
        subdomain || null,
        plan || 'free',
        max_students || 500,
        max_teachers || 50,
        logo_url || null
      ]
    )

    res.status(201).json({
      message: 'School created successfully',
      school: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
}

/** List all tenant schools with optional filters */
export const listSchools = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, search, plan, is_active } = req.query
    const pageNum = Number(page)
    const limitNum = Number(limit)
    const offset = (pageNum - 1) * limitNum

    const params: any[] = []
    let paramIndex = 1
    let whereClause = 'WHERE 1=1'

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR contact_email ILIKE $${paramIndex} OR subdomain ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    if (plan) {
      whereClause += ` AND plan = $${paramIndex}`
      params.push(plan)
      paramIndex++
    }

    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${paramIndex}`
      params.push(is_active === 'true')
      paramIndex++
    }

    const schools = await query(
      `SELECT s.*, 
        (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id AND u.role = 'student') as student_count,
        (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id AND u.role = 'teacher') as teacher_count,
        (SELECT COUNT(*) FROM users u WHERE u.school_id = s.id AND u.role = 'admin') as admin_count
       FROM schools s
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    )

    const countResult = await query(
      `SELECT COUNT(*) FROM schools ${whereClause}`,
      params
    )

    res.json({
      schools: schools.rows,
      totalCount: parseInt(countResult.rows[0].count),
      page: pageNum,
      limit: limitNum
    })
  } catch (error) {
    next(error)
  }
}

/** Get a single school with detailed stats */
export const getSchool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const schoolResult = await query('SELECT * FROM schools WHERE id = $1', [id])
    if (schoolResult.rows.length === 0) {
      throw new AppError('School not found', 404, 'SCHOOL_NOT_FOUND')
    }

    const stats = await query(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'student') as students,
        (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'teacher') as teachers,
        (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'admin') as admins,
        (SELECT COUNT(*) FROM decks WHERE school_id = $1) as decks,
        (SELECT COUNT(*) FROM activities WHERE school_id = $1) as activities,
        (SELECT COUNT(*) FROM attendance WHERE school_id = $1 AND date = CURRENT_DATE) as attendance_today,
        (SELECT COALESCE(SUM(cost_usd), 0) FROM ai_costs WHERE school_id = $1) as total_ai_cost`,
      [id]
    )

    res.json({
      school: schoolResult.rows[0],
      stats: stats.rows[0]
    })
  } catch (error) {
    next(error)
  }
}

/** Update school info / plan / status */
export const updateSchool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { name, address, contact_email, contact_phone, subdomain, plan, is_active, max_students, max_teachers, logo_url, settings } = req.body

    const schoolResult = await query('SELECT id FROM schools WHERE id = $1', [id])
    if (schoolResult.rows.length === 0) {
      throw new AppError('School not found', 404, 'SCHOOL_NOT_FOUND')
    }

    // Check subdomain uniqueness if changing
    if (subdomain) {
      const existing = await query('SELECT id FROM schools WHERE subdomain = $1 AND id != $2', [subdomain, id])
      if (existing.rows.length > 0) {
        throw new AppError('Subdomain already taken', 409, 'SUBDOMAIN_TAKEN')
      }
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    const fields: Record<string, any> = {
      name, address, contact_email, contact_phone, subdomain,
      plan, is_active, max_students, max_teachers, logo_url, settings
    }

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`)
        values.push(key === 'settings' ? JSON.stringify(value) : value)
        paramIndex++
      }
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400, 'NO_UPDATES')
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const result = await query(
      `UPDATE schools SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    res.json({ message: 'School updated', school: result.rows[0] })
  } catch (error) {
    next(error)
  }
}

/** Permanently delete a school (cascade deletes all tenant data) */
export const deleteSchool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const schoolResult = await query('SELECT id, name FROM schools WHERE id = $1', [id])
    if (schoolResult.rows.length === 0) {
      throw new AppError('School not found', 404, 'SCHOOL_NOT_FOUND')
    }

    await query('DELETE FROM schools WHERE id = $1', [id])

    res.json({
      message: `School "${schoolResult.rows[0].name}" and all associated data deleted permanently`,
      schoolId: id
    })
  } catch (error) {
    next(error)
  }
}

/** Suspend / re-activate a school */
export const toggleSchoolStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { is_active } = req.body

    if (typeof is_active !== 'boolean') {
      throw new AppError('is_active (boolean) is required', 400, 'MISSING_FIELD')
    }

    const result = await query(
      `UPDATE schools SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, is_active`,
      [is_active, id]
    )

    if (result.rows.length === 0) {
      throw new AppError('School not found', 404, 'SCHOOL_NOT_FOUND')
    }

    res.json({
      message: `School ${is_active ? 'activated' : 'suspended'} successfully`,
      school: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────
// Super-Admin dashboard / analytics
// ─────────────────────────────────────────────────────────────────

/** Platform-wide statistics for super-admin dashboard */
export const getPlatformStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [schoolStats, userStats, contentStats, aiStats, recentSchools] = await Promise.all([
      query(`SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active) as active,
        COUNT(*) FILTER (WHERE NOT is_active) as suspended,
        COUNT(*) FILTER (WHERE plan = 'free') as free_plan,
        COUNT(*) FILTER (WHERE plan = 'basic') as basic_plan,
        COUNT(*) FILTER (WHERE plan = 'pro') as pro_plan,
        COUNT(*) FILTER (WHERE plan = 'enterprise') as enterprise_plan
       FROM schools`),

      query(`SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'student') as students,
        COUNT(*) FILTER (WHERE role = 'teacher') as teachers,
        COUNT(*) FILTER (WHERE role = 'admin') as admins
       FROM users WHERE role != 'super_admin'`),

      query(`SELECT
        (SELECT COUNT(*) FROM decks) as total_decks,
        (SELECT COUNT(*) FROM activities) as total_activities,
        (SELECT COUNT(*) FROM lesson_plans) as total_lesson_plans,
        (SELECT COUNT(*) FROM doubts) as total_doubts`),

      query(`SELECT
        COALESCE(SUM(cost_usd), 0) as total_cost,
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COALESCE(SUM(cost_usd) FILTER (WHERE created_at >= date_trunc('month', NOW())), 0) as cost_this_month
       FROM ai_costs`),

      query(`SELECT id, name, contact_email, plan, is_active, created_at
       FROM schools ORDER BY created_at DESC LIMIT 5`)
    ])

    res.json({
      schools: schoolStats.rows[0],
      users: userStats.rows[0],
      content: contentStats.rows[0],
      ai: aiStats.rows[0],
      recentSchools: recentSchools.rows
    })
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────
// School Admin management
// ─────────────────────────────────────────────────────────────────

/** Create admin user for a school */
export const createSchoolAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { school_id, email, name } = req.body

    if (!school_id || !email || !name) {
      throw new AppError('school_id, email, and name are required', 400, 'MISSING_FIELDS')
    }

    // Verify school exists
    const schoolCheck = await query('SELECT id, name FROM schools WHERE id = $1', [school_id])
    if (schoolCheck.rows.length === 0) {
      throw new AppError('School not found', 404, 'SCHOOL_NOT_FOUND')
    }

    // Check email uniqueness
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existingUser.rows.length > 0) {
      throw new AppError('User with this email already exists', 409, 'USER_EXISTS')
    }

    const DEFAULT_PASSWORD = 'Admin@123'
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

    const result = await query(
      `INSERT INTO users (email, password, name, role, school_id, profile_completed)
       VALUES ($1, $2, $3, 'admin', $4, true)
       RETURNING id, email, name, role, school_id, created_at`,
      [email, hashedPassword, name, school_id]
    )

    res.status(201).json({
      message: `Admin created for school "${schoolCheck.rows[0].name}"`,
      user: result.rows[0],
      temporaryPassword: DEFAULT_PASSWORD
    })
  } catch (error) {
    next(error)
  }
}

/** List all users across all schools (super-admin global view) */
export const listAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, school_id, role, search } = req.query
    const pageNum = Number(page)
    const limitNum = Number(limit)
    const offset = (pageNum - 1) * limitNum

    const params: any[] = []
    let paramIndex = 1
    let whereClause = "WHERE u.role != 'super_admin'"

    if (school_id) {
      whereClause += ` AND u.school_id = $${paramIndex}`
      params.push(school_id)
      paramIndex++
    }

    if (role) {
      whereClause += ` AND u.role = $${paramIndex}`
      params.push(role)
      paramIndex++
    }

    if (search) {
      whereClause += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.school_id, u.status, u.created_at,
              s.name as school_name, s.subdomain as school_subdomain
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    )

    const countResult = await query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    )

    res.json({
      users: result.rows,
      totalCount: parseInt(countResult.rows[0].count),
      page: pageNum,
      limit: limitNum
    })
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────
// School self-registration (public endpoint)
// ─────────────────────────────────────────────────────────────────

/** Public: Register a new school and its first admin */
export const registerSchool = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      school_name, school_address, contact_email, contact_phone, subdomain,
      admin_name, admin_email, admin_password
    } = req.body

    if (!school_name || !contact_email || !admin_name || !admin_email || !admin_password) {
      throw new AppError('All fields are required', 400, 'MISSING_FIELDS')
    }

    // Check subdomain
    if (subdomain) {
      const existing = await query('SELECT id FROM schools WHERE subdomain = $1', [subdomain])
      if (existing.rows.length > 0) {
        throw new AppError('Subdomain is already taken', 409, 'SUBDOMAIN_TAKEN')
      }
    }

    // Check admin email
    const existingAdmin = await query('SELECT id FROM users WHERE email = $1', [admin_email])
    if (existingAdmin.rows.length > 0) {
      throw new AppError('Admin email already registered', 409, 'EMAIL_TAKEN')
    }

    // Create school
    const schoolResult = await query(
      `INSERT INTO schools (name, address, contact_email, contact_phone, subdomain)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [school_name, school_address || null, contact_email, contact_phone || null, subdomain || null]
    )
    const school = schoolResult.rows[0]

    // Create admin user
    const hashedPassword = await bcrypt.hash(admin_password, 10)
    const userResult = await query(
      `INSERT INTO users (email, password, name, role, school_id, profile_completed)
       VALUES ($1, $2, $3, 'admin', $4, true)
       RETURNING id, email, name, role, school_id, created_at`,
      [admin_email, hashedPassword, admin_name, school.id]
    )

    res.status(201).json({
      message: 'School registered successfully! You can now log in.',
      school: {
        id: school.id,
        name: school.name,
        subdomain: school.subdomain
      },
      admin: userResult.rows[0]
    })
  } catch (error) {
    next(error)
  }
}

/** Public: Get school info by subdomain (for login page branding) */
export const getSchoolBySubdomain = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { subdomain } = req.params

    const result = await query(
      `SELECT id, name, subdomain, logo_url, contact_email, is_active FROM schools WHERE subdomain = $1`,
      [subdomain]
    )

    if (result.rows.length === 0) {
      throw new AppError('School not found', 404, 'SCHOOL_NOT_FOUND')
    }

    const school = result.rows[0]
    if (!school.is_active) {
      throw new AppError('This school account is suspended', 403, 'SCHOOL_SUSPENDED')
    }

    res.json({ school })
  } catch (error) {
    next(error)
  }
}
