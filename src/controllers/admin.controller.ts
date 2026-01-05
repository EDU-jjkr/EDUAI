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

// Delete teacher content (lesson plan or deck)
export const deleteTeacherContent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { contentType, id } = req.params

    if (contentType === 'lesson_plan') {
      await query('DELETE FROM lesson_plans WHERE id = $1', [id])
    } else if (contentType === 'deck') {
      // Delete slides first (foreign key constraint)
      await query('DELETE FROM slides WHERE deck_id = $1', [id])
      await query('DELETE FROM decks WHERE id = $1', [id])
    } else {
      throw new AppError('Invalid content type', 400, 'INVALID_CONTENT_TYPE')
    }

    res.json({
      message: 'Content deleted successfully'
    })
  } catch (error) {
    next(error)
  }
}

// Assign teacher to class
export const assignClassTeacher = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { classId, teacherId } = req.body

    if (!classId || !teacherId) {
      throw new AppError('Class ID and Teacher ID are required', 400, 'MISSING_FIELDS')
    }

    // Verify teacher exists and is a teacher
    const teacherCheck = await query(
      'SELECT id, role FROM users WHERE id = $1',
      [teacherId]
    )

    if (teacherCheck.rows.length === 0) {
      throw new AppError('Teacher not found', 404, 'TEACHER_NOT_FOUND')
    }

    if (teacherCheck.rows[0].role !== 'teacher') {
      throw new AppError('User is not a teacher', 400, 'NOT_A_TEACHER')
    }

    // Parse classId to get grade_level and section
    // classId format: "grade_level-section" or "grade_level-default"
    const [gradeLevel, sectionPart] = classId.split('-')
    const section = sectionPart === 'default' ? null : sectionPart

    // Update teacher's class assignment
    await query(
      `UPDATE users 
       SET class_teacher_of = $1, assigned_section = $2
       WHERE id = $3 AND role = 'teacher'`,
      [gradeLevel, section, teacherId]
    )

    res.json({
      message: 'Class teacher assigned successfully'
    })
  } catch (error) {
    next(error)
  }
}

// Get classes (for admin to manage)
export const getClasses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.user!.school_id

    // Get unique combinations of grade_level and section from students
    const result = await query(
      `SELECT DISTINCT 
        grade_level,
        section,
        CONCAT(grade_level, COALESCE(' - ' || section, '')) as name,
        grade_level || '-' || COALESCE(section, 'default') as id
       FROM users
       WHERE role = 'student' 
       AND (school_id = $1 OR (school_id IS NULL AND $1 IS NULL))
       AND grade_level IS NOT NULL
       ORDER BY grade_level, section`,
      [schoolId]
    )

    // For each class, check if there's an assigned teacher
    const classes = await Promise.all(result.rows.map(async (row) => {
      // Try to find a teacher assigned to this grade_level and section
      const teacherResult = await query(
        `SELECT id, name FROM users 
         WHERE role = 'teacher' 
         AND class_teacher_of = $1 
         AND (assigned_section = $2 OR (assigned_section IS NULL AND $2 IS NULL))
         AND (school_id = $3 OR (school_id IS NULL AND $3 IS NULL))
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

// Create class
export const createClass = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, grade_level, section } = req.body
    const schoolId = req.user!.school_id

    if (!name || !grade_level) {
      throw new AppError('Name and grade level are required', 400, 'MISSING_FIELDS')
    }

    const result = await query(
      `INSERT INTO classes (school_id, name, grade_level, section)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [schoolId, name, grade_level, section || null]
    )

    res.status(201).json({
      message: 'Class created successfully',
      class: result.rows[0]
    })
  } catch (error) {
    next(error)
  }
}
// Get minimal analytics summary for dashboard overview
export const getAnalyticsSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userCountResult = await query('SELECT COUNT(*) as total FROM users')
    const deckCountResult = await query('SELECT COUNT(*) as total FROM decks')
    const activityCountResult = await query('SELECT COUNT(*) as total FROM activities')

    res.json({
      totalUsers: parseInt(userCountResult.rows[0].total),
      activeUsers: parseInt(userCountResult.rows[0].total), // Placeholder: same as total
      totalDecks: parseInt(deckCountResult.rows[0].total),
      totalActivities: parseInt(activityCountResult.rows[0].total),
      totalDoubts: 0, // Restricted
      aiCostTotal: 0, // Restricted
      aiCostThisMonth: 0, // Restricted
    })
  } catch (error) {
    next(error)
  }
}
