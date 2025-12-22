import { Response, NextFunction } from 'express'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import bcrypt from 'bcrypt'

const DEFAULT_PASSWORD = 'welcome@123'

// Create new user
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, name, role, school_id, grade_level, subjects_teaching, section, department, joining_date } = req.body

    // Validation
    if (!email || !name || !role) {
      throw new AppError('Email, name, and role are required', 400, 'MISSING_FIELDS')
    }

    // Validate role
    const validRoles = ['student', 'teacher', 'admin']
    if (!validRoles.includes(role)) {
      throw new AppError('Invalid role', 400, 'INVALID_ROLE')
    }

    // Role-specific validation
    if (role === 'student' && !grade_level) {
      throw new AppError('Grade level is required for students', 400, 'GRADE_LEVEL_REQUIRED')
    }

    // Check if user already exists
    const existingUser = await query('SELECT * FROM users WHERE email = $1', [email])
    if (existingUser.rows.length > 0) {
      throw new AppError('User with this email already exists', 400, 'USER_EXISTS')
    }

    // Hash default password
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

    // Insert user
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
        null, // department field deprecated
        joining_date || new Date(), // Default to now if not provided
        true // profile_completed
      ]
    )

    const user = result.rows[0]

    res.status(201).json({
      user,
      message: 'User created successfully',
      defaultPassword: DEFAULT_PASSWORD // Send password in response for admin to share with user
    })
  } catch (error) {
    next(error)
  }
}

// Get all users with pagination
export const getAllUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query

    const pageNum = Number(page)
    const limitNum = Number(limit)
    const offset = (pageNum - 1) * limitNum

    let whereClause = 'WHERE 1=1'
    const queryParams: any[] = []
    let paramIndex = 1

    if (role) {
      whereClause += ` AND role = $${paramIndex}`
      queryParams.push(role)
      paramIndex++
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
      queryParams.push(`%${search}%`)
      paramIndex++
    }

    const result = await query(
      `SELECT id, name, email, role, school_id, grade_level, subjects_teaching, section, joining_date, created_at, profile_completed 
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limitNum, offset]
    )

    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`,
      queryParams
    )

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

// Get specific user
export const getUserById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const result = await query(
      'SELECT id, name, email, role, school_id, grade_level, subjects_teaching, section, joining_date, created_at, profile_completed FROM users WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    res.json(result.rows[0])
  } catch (error) {
    next(error)
  }
}

// Update user
export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { name, email, role, school_id, grade_level, subjects_teaching, section, class_teacher_of, assigned_section, joining_date } = req.body

    const existingUser = await query('SELECT * FROM users WHERE id = $1', [id])
    if (existingUser.rows.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`)
      values.push(name)
      paramIndex++
    }

    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`)
      values.push(email)
      paramIndex++
    }

    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`)
      values.push(role)
      paramIndex++
    }

    if (school_id !== undefined) {
      updates.push(`school_id = $${paramIndex}`)
      values.push(school_id)
      paramIndex++
    }

    if (grade_level !== undefined) {
      updates.push(`grade_level = $${paramIndex}`)
      values.push(grade_level)
      paramIndex++
    }

    if (subjects_teaching !== undefined) {
      updates.push(`subjects_teaching = $${paramIndex}`)
      values.push(JSON.stringify(subjects_teaching))
      paramIndex++
    }

    // NEW: Section for students
    if (section !== undefined) {
      updates.push(`section = $${paramIndex}`)
      values.push(section)
      paramIndex++
    }

    // NEW: Class teacher assignment for teachers
    if (class_teacher_of !== undefined) {
      updates.push(`class_teacher_of = $${paramIndex}`)
      values.push(class_teacher_of)
      paramIndex++
    }

    if (assigned_section !== undefined) {
      updates.push(`assigned_section = $${paramIndex}`)
      values.push(assigned_section)
      paramIndex++
    }

    if (joining_date !== undefined) {
      updates.push(`joining_date = $${paramIndex}`)
      values.push(joining_date)
      paramIndex++
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

// Delete user
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const adminId = req.user!.id

    if (id === adminId) {
      throw new AppError('Cannot delete your own account', 400, 'SELF_DELETE')
    }

    const existingUser = await query('SELECT * FROM users WHERE id = $1', [id])
    if (existingUser.rows.length === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND')
    }

    await query('DELETE FROM users WHERE id = $1', [id])

    res.json({ message: 'User deleted successfully', userId: id })
  } catch (error) {
    next(error)
  }
}

// Get platform statistics
export const getStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userStats = await query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `)

    const doubtStats = await query('SELECT COUNT(*) as total FROM doubts')

    const doubtsBySubject = await query(`
      SELECT subject, COUNT(*) as count 
      FROM doubts 
      WHERE subject IS NOT NULL
      GROUP BY subject 
      ORDER BY count DESC 
      LIMIT 10
    `)

    const recentDoubts = await query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM doubts
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `)

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

// Get teacher-generated content (lesson plans and decks)
export const getTeacherContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { contentType, page = 1, limit = 20 } = req.query
    const pageNum = Number(page)
    const limitNum = Number(limit)
    const offset = (pageNum - 1) * limitNum

    // Get lesson plans created by teachers
    const lessonPlansQuery = `
      SELECT 
        lp.id,
        lp.title,
        lp.subject,
        lp.grade_level,
        lp.created_at,
        'lesson_plan' as content_type,
        u.id as teacher_id,
        u.name as teacher_name,
        u.email as teacher_email
      FROM lesson_plans lp
      JOIN users u ON lp.created_by = u.id
      WHERE u.role = 'teacher'
    `

    // Get decks created by teachers
    const decksQuery = `
      SELECT 
        d.id,
        d.title,
        d.subject,
        d.grade_level,
        d.created_at,
        'deck' as content_type,
        u.id as teacher_id,
        u.name as teacher_name,
        u.email as teacher_email
      FROM decks d
      JOIN users u ON d.created_by = u.id
      WHERE u.role = 'teacher'
    `

    let combinedQuery: string
    if (contentType === 'lesson_plan') {
      combinedQuery = `${lessonPlansQuery} ORDER BY lp.created_at DESC LIMIT $1 OFFSET $2`
    } else if (contentType === 'deck') {
      combinedQuery = `${decksQuery} ORDER BY d.created_at DESC LIMIT $1 OFFSET $2`
    } else {
      // Get both types using subqueries
      combinedQuery = `
        SELECT * FROM (
          ${lessonPlansQuery}
          UNION ALL
          ${decksQuery}
        ) combined
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `
    }

    const result = await query(combinedQuery, [limitNum, offset])

    // Get total count for pagination
    let countQuery: string
    if (contentType === 'lesson_plan') {
      countQuery = `SELECT COUNT(*) FROM lesson_plans lp JOIN users u ON lp.created_by = u.id WHERE u.role = 'teacher'`
    } else if (contentType === 'deck') {
      countQuery = `SELECT COUNT(*) FROM decks d JOIN users u ON d.created_by = u.id WHERE u.role = 'teacher'`
    } else {
      countQuery = `
        SELECT (
          (SELECT COUNT(*) FROM lesson_plans lp JOIN users u ON lp.created_by = u.id WHERE u.role = 'teacher')
          +
          (SELECT COUNT(*) FROM decks d JOIN users u ON d.created_by = u.id WHERE u.role = 'teacher')
        ) as count
      `
    }

    const countResult = await query(countQuery, [])
    const totalCount = parseInt(countResult.rows[0].count)

    res.json({
      content: result.rows,
      totalCount,
      page: pageNum,
      limit: limitNum,
    })
  } catch (error) {
    next(error)
  }
}

