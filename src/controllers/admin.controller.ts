import { Response, NextFunction } from 'express'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import bcrypt from 'bcrypt'

const DEFAULT_PASSWORD = 'c'

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get effective school scope for a request
// super_admin may supply ?school_id=, normal admins always use their own school
// ─────────────────────────────────────────────────────────────────────────────
const getSchoolId = (req: AuthRequest): string | null => {
  if (req.user?.role === 'super_admin') {
    return (req.query.school_id as string) || (req.body?.school_id as string) || null
  }
  return req.user?.school_id || null
}

// ─────────────────────────────────────────────────────────────────────────────
// Create new user (tenant-scoped)
// ─────────────────────────────────────────────────────────────────────────────
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, name, role, school_id: bodySchoolId, grade_level, subjects_teaching, section, department, joining_date } = req.body

    // Determine school_id: admin uses own school, super_admin can supply any
    const school_id = req.user?.role === 'super_admin' ? bodySchoolId : req.user?.school_id

    if (!email || !name || !role) {
      throw new AppError('Email, name, and role are required', 400, 'MISSING_FIELDS')
    }

    const validRoles = ['student', 'teacher', 'admin']
    if (!validRoles.includes(role)) {
      throw new AppError('Invalid role', 400, 'INVALID_ROLE')
    }

    if (role === 'student' && !grade_level) {
      throw new AppError('Grade level is required for students', 400, 'GRADE_LEVEL_REQUIRED')
    }

    const existingUser = await query('SELECT * FROM users WHERE email = $1', [email])
    if (existingUser.rows.length > 0) {
      throw new AppError('User with this email already exists', 400, 'USER_EXISTS')
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

    const result = await query(
      `INSERT INTO users (email, password, name, role, school_id, grade_level, subjects_teaching, section, department, joining_date, profile_completed) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING id, email, name, role, school_id, grade_level, subjects_teaching, section, department, joining_date, created_at`,
      [
        email,
        hashedPassword,
        name,
        role,
        school_id || null,
        role === 'student' ? grade_level : null,
        role === 'teacher' && subjects_teaching ? JSON.stringify(subjects_teaching) : null,
        role === 'student' ? section : null,
        null,
        joining_date || new Date(),
        true
      ]
    )

    res.status(201).json({
      user: result.rows[0],
      message: 'User created successfully',
      defaultPassword: DEFAULT_PASSWORD
    })
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get all users — TENANT SCOPED
// ─────────────────────────────────────────────────────────────────────────────
export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query
    const schoolId = getSchoolId(req)

    const pageNum = Number(page)
    const limitNum = Number(limit)
    const offset = (pageNum - 1) * limitNum

    const params: any[] = []
    let paramIndex = 1
    let whereClause = "WHERE 1=1 AND role != 'super_admin'"

    // Tenant scope
    if (schoolId) {
      whereClause += ` AND school_id = $${paramIndex}`
      params.push(schoolId)
      paramIndex++
    }

    if (role) {
      whereClause += ` AND role = $${paramIndex}`
      params.push(role)
      paramIndex++
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    const result = await query(
      `SELECT id, name, email, role, school_id, grade_level, subjects_teaching, section, joining_date, created_at, profile_completed 
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    )

    const countResult = await query(`SELECT COUNT(*) FROM users ${whereClause}`, params)

    res.json({
      users: result.rows,
      totalCount: parseInt(countResult.rows[0].count),
      page: pageNum,
      limit: limitNum,
    })
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get specific user — TENANT SCOPED
// ─────────────────────────────────────────────────────────────────────────────
export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = getSchoolId(req)

    let sql = 'SELECT id, name, email, role, school_id, grade_level, subjects_teaching, section, joining_date, created_at, profile_completed FROM users WHERE id = $1'
    const params: any[] = [id]

    // Tenant guard: non-super-admin can only see users in their school
    if (schoolId) {
      sql += ' AND school_id = $2'
      params.push(schoolId)
    }

    const result = await query(sql, params)

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Update user — TENANT SCOPED
// ─────────────────────────────────────────────────────────────────────────────
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const schoolId = getSchoolId(req)
    const { name, email, role, school_id, grade_level, subjects_teaching, section, class_teacher_of, assigned_section, joining_date } = req.body

    // Verify user belongs to the admin's school
    let checkSql = 'SELECT * FROM users WHERE id = $1'
    const checkParams: any[] = [id]
    if (schoolId) {
      checkSql += ' AND school_id = $2'
      checkParams.push(schoolId)
    }

    const existingUser = await query(checkSql, checkParams)
    if (existingUser.rows.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    const fieldMap: Record<string, any> = {
      name, email, role, grade_level, subjects_teaching: subjects_teaching !== undefined ? JSON.stringify(subjects_teaching) : undefined,
      section, class_teacher_of, assigned_section, joining_date
    }

    // super_admin can reassign school_id
    if (req.user?.role === 'super_admin' && school_id !== undefined) {
      fieldMap.school_id = school_id
    }

    for (const [key, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`)
        values.push(value)
        paramIndex++
      }
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400, 'NO_UPDATES')
    }

    values.push(id)

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} 
       RETURNING id, name, email, role, school_id, grade_level, subjects_teaching, section, class_teacher_of, assigned_section, joining_date, created_at`,
      values
    )

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete user — TENANT SCOPED
// ─────────────────────────────────────────────────────────────────────────────
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const adminId = req.user!.id
    const schoolId = getSchoolId(req)

    if (id === adminId) {
      throw new AppError('Cannot delete your own account', 400, 'SELF_DELETE')
    }

    let checkSql = 'SELECT * FROM users WHERE id = $1'
    const checkParams: any[] = [id]
    if (schoolId) {
      checkSql += ' AND school_id = $2'
      checkParams.push(schoolId)
    }

    const existingUser = await query(checkSql, checkParams)
    if (existingUser.rows.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    await query('DELETE FROM users WHERE id = $1', [id])

    res.json({ message: 'User deleted successfully', userId: id })
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform statistics — TENANT SCOPED
// ─────────────────────────────────────────────────────────────────────────────
export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = getSchoolId(req)

    const params: any[] = []
    let schoolFilter = ''
    if (schoolId) {
      schoolFilter = ' AND school_id = $1'
      params.push(schoolId)
    }

    const userStats = await query(
      `SELECT role, COUNT(*) as count FROM users WHERE 1=1${schoolFilter} GROUP BY role`,
      params
    )

    const doubtStats = await query(
      `SELECT COUNT(*) as total FROM doubts WHERE 1=1${schoolFilter}`,
      params
    )

    const doubtsBySubject = await query(
      `SELECT subject, COUNT(*) as count FROM doubts WHERE subject IS NOT NULL${schoolFilter ? ' AND school_id = $1' : ''} GROUP BY subject ORDER BY count DESC LIMIT 10`,
      params
    )

    const recentDoubts = await query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM doubts
       WHERE created_at >= NOW() - INTERVAL '7 days'${schoolFilter ? ' AND school_id = $1' : ''}
       GROUP BY DATE(created_at) ORDER BY date DESC`,
      params
    )

    res.json({
      userStats: userStats.rows,
      totalDoubts: parseInt(doubtStats.rows[0].total),
      doubtsBySubject: doubtsBySubject.rows,
      recentActivity: recentDoubts.rows,
    })
  } catch (error) {
    next(error)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Teacher content (lesson plans + decks) — TENANT SCOPED
// ─────────────────────────────────────────────────────────────────────────────
export const getTeacherContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { contentType, page = 1, limit = 20 } = req.query
    const schoolId = getSchoolId(req)
    const pageNum = Number(page)
    const limitNum = Number(limit)
    const offset = (pageNum - 1) * limitNum

    const schoolFilter = schoolId ? `AND lp.school_id = '${schoolId}'` : ''
    const deckSchoolFilter = schoolId ? `AND d.school_id = '${schoolId}'` : ''

    const lessonPlansQuery = `
      SELECT lp.id, lp.title, lp.subject, lp.grade_level, lp.created_at,
        'lesson_plan' as content_type,
        u.id as teacher_id, u.name as teacher_name, u.email as teacher_email
      FROM lesson_plans lp
      JOIN users u ON lp.created_by = u.id
      WHERE u.role = 'teacher' ${schoolFilter}`

    const decksQuery = `
      SELECT d.id, d.title, d.subject, d.grade_level, d.created_at,
        'deck' as content_type,
        u.id as teacher_id, u.name as teacher_name, u.email as teacher_email
      FROM decks d
      JOIN users u ON d.created_by = u.id
      WHERE u.role = 'teacher' ${deckSchoolFilter}`

    let combinedQuery: string
    if (contentType === 'lesson_plan') {
      combinedQuery = `${lessonPlansQuery} ORDER BY lp.created_at DESC LIMIT $1 OFFSET $2`
    } else if (contentType === 'deck') {
      combinedQuery = `${decksQuery} ORDER BY d.created_at DESC LIMIT $1 OFFSET $2`
    } else {
      combinedQuery = `
        SELECT * FROM (${lessonPlansQuery} UNION ALL ${decksQuery}) combined
        ORDER BY created_at DESC LIMIT $1 OFFSET $2`
    }

    const result = await query(combinedQuery, [limitNum, offset])

    let countQuery: string
    if (contentType === 'lesson_plan') {
      countQuery = `SELECT COUNT(*) FROM lesson_plans lp JOIN users u ON lp.created_by = u.id WHERE u.role = 'teacher' ${schoolFilter}`
    } else if (contentType === 'deck') {
      countQuery = `SELECT COUNT(*) FROM decks d JOIN users u ON d.created_by = u.id WHERE u.role = 'teacher' ${deckSchoolFilter}`
    } else {
      countQuery = `SELECT (
        (SELECT COUNT(*) FROM lesson_plans lp JOIN users u ON lp.created_by = u.id WHERE u.role = 'teacher' ${schoolFilter})
        + (SELECT COUNT(*) FROM decks d JOIN users u ON d.created_by = u.id WHERE u.role = 'teacher' ${deckSchoolFilter})
      ) as count`
    }

    const countResult = await query(countQuery, [])

    res.json({
      content: result.rows,
      totalCount: parseInt(countResult.rows[0].count),
      page: pageNum,
      limit: limitNum,
    })
  } catch (error) {
    next(error)
  }
}

// Delete teacher content (unchanged logic, no cross-tenant risk since IDs are UUIDs)
export const deleteTeacherContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { contentType, id } = req.params
    const schoolId = getSchoolId(req)

    if (contentType === 'lesson_plan') {
      // Verify ownership before delete
      const check = await query(
        `SELECT id FROM lesson_plans WHERE id = $1${schoolId ? ' AND school_id = $2' : ''}`,
        schoolId ? [id, schoolId] : [id]
      )
      if (check.rows.length === 0) throw new AppError('Content not found', 404, 'NOT_FOUND')
      await query('DELETE FROM lesson_plans WHERE id = $1', [id])
    } else if (contentType === 'deck') {
      const check = await query(
        `SELECT id FROM decks WHERE id = $1${schoolId ? ' AND school_id = $2' : ''}`,
        schoolId ? [id, schoolId] : [id]
      )
      if (check.rows.length === 0) throw new AppError('Content not found', 404, 'NOT_FOUND')
      await query('DELETE FROM slides WHERE deck_id = $1', [id])
      await query('DELETE FROM decks WHERE id = $1', [id])
    } else {
      throw new AppError('Invalid content type', 400, 'INVALID_CONTENT_TYPE')
    }

    res.json({ message: 'Content deleted successfully' })
  } catch (error) {
    next(error)
  }
}

// Assign teacher to class — TENANT SCOPED
export const assignClassTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, teacherId } = req.body
    const schoolId = getSchoolId(req)

    if (!classId || !teacherId) {
      throw new AppError('Class ID and Teacher ID are required', 400, 'MISSING_FIELDS')
    }

    const teacherCheck = await query(
      `SELECT id, role FROM users WHERE id = $1${schoolId ? ' AND school_id = $2' : ''}`,
      schoolId ? [teacherId, schoolId] : [teacherId]
    )

    if (teacherCheck.rows.length === 0) throw new AppError('Teacher not found', 404, 'TEACHER_NOT_FOUND')
    if (teacherCheck.rows[0].role !== 'teacher') throw new AppError('User is not a teacher', 400, 'NOT_A_TEACHER')

    const [gradeLevel, sectionPart] = classId.split('-')
    const section = sectionPart === 'default' ? null : sectionPart

    await query(
      `UPDATE users SET class_teacher_of = $1, assigned_section = $2 WHERE id = $3 AND role = 'teacher'`,
      [gradeLevel, section, teacherId]
    )

    res.json({ message: 'Class teacher assigned successfully' })
  } catch (error) {
    next(error)
  }
}

// Get classes — TENANT SCOPED
export const getClasses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = getSchoolId(req)

    const result = await query(
      `SELECT DISTINCT 
        grade_level, section,
        CONCAT(grade_level, COALESCE(' - ' || section, '')) as name,
        grade_level || '-' || COALESCE(section, 'default') as id
       FROM users
       WHERE role = 'student' 
       AND (school_id = $1 OR ($1 IS NULL AND school_id IS NULL))
       AND grade_level IS NOT NULL
       ORDER BY grade_level, section`,
      [schoolId]
    )

    const classes = await Promise.all(result.rows.map(async (row) => {
      const teacherResult = await query(
        `SELECT id, name FROM users 
         WHERE role = 'teacher' 
         AND class_teacher_of = $1 
         AND (assigned_section = $2 OR (assigned_section IS NULL AND $2 IS NULL))
         AND (school_id = $3 OR ($3 IS NULL AND school_id IS NULL))
         LIMIT 1`,
        [row.grade_level, row.section, schoolId]
      )

      return {
        id: row.id,
        name: row.name,
        grade_level: row.grade_level,
        section: row.section,
        class_teacher_id: teacherResult.rows[0]?.id || null,
        class_teacher_name: teacherResult.rows[0]?.name || null
      }
    }))

    res.json(classes)
  } catch (error) {
    next(error)
  }
}

// Create class — TENANT SCOPED
export const createClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, grade_level, section } = req.body
    const schoolId = getSchoolId(req) || req.user!.school_id

    if (!name || !grade_level) {
      throw new AppError('Name and grade level are required', 400, 'MISSING_FIELDS')
    }

    const result = await query(
      `INSERT INTO classes (school_id, name, grade_level, section) VALUES ($1, $2, $3, $4) RETURNING *`,
      [schoolId, name, grade_level, section || null]
    )

    res.status(201).json({ message: 'Class created successfully', class: result.rows[0] })
  } catch (error) {
    next(error)
  }
}

// Analytics summary — TENANT SCOPED
export const getAnalyticsSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = getSchoolId(req)

    const params: any[] = []
    let filter = ''
    if (schoolId) {
      filter = ' WHERE school_id = $1'
      params.push(schoolId)
    }

    const [userCount, deckCount, activityCount] = await Promise.all([
      query(`SELECT COUNT(*) as total FROM users${filter}`, params),
      query(`SELECT COUNT(*) as total FROM decks${filter}`, params),
      query(`SELECT COUNT(*) as total FROM activities${filter}`, params),
    ])

    res.json({
      totalUsers: parseInt(userCount.rows[0].total),
      activeUsers: parseInt(userCount.rows[0].total),
      totalDecks: parseInt(deckCount.rows[0].total),
      totalActivities: parseInt(activityCount.rows[0].total),
      totalDoubts: 0,
      aiCostTotal: 0,
      aiCostThisMonth: 0,
    })
  } catch (error) {
    next(error)
  }
}
