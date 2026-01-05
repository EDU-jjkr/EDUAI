import { Response, NextFunction } from 'express'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import logger from '../utils/logger'

// ============================================
// TEACHER ENDPOINTS
// ============================================

// Assign homework (Teacher)
export const assignHomework = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { title, subject, description, className, section, dueDate } = req.body
        const teacherId = req.user!.id
        const schoolId = req.user!.school_id

        if (!title || !subject || !className || !dueDate) {
            throw new AppError('Title, subject, className, and dueDate are required', 400, 'MISSING_FIELDS')
        }

        const result = await query(
            `INSERT INTO homework (title, subject, description, class_name, section, due_date, school_id, assigned_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [title, subject, description || null, className, section || null, dueDate, schoolId, teacherId]
        )

        logger.info(`Homework assigned: ${title} by teacher ${teacherId}`)

        res.status(201).json({
            message: 'Homework assigned successfully',
            homework: result.rows[0]
        })
    } catch (error) {
        next(error)
    }
}

// Get homework list (Teacher - all assigned by them)
export const getTeacherHomework = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const teacherId = req.user!.id
        const { status, className } = req.query

        let whereClause = 'WHERE assigned_by = $1'
        const params: any[] = [teacherId]
        let paramIndex = 2

        if (status) {
            whereClause += ` AND status = $${paramIndex}`
            params.push(status)
            paramIndex++
        }

        if (className) {
            whereClause += ` AND class_name = $${paramIndex}`
            params.push(className)
            paramIndex++
        }

        const result = await query(
            `SELECT h.*, u.name as assigned_by_name
       FROM homework h
       LEFT JOIN users u ON h.assigned_by = u.id
       ${whereClause}
       ORDER BY h.due_date DESC, h.created_at DESC`,
            params
        )

        res.json(result.rows)
    } catch (error) {
        next(error)
    }
}

// Update homework (Teacher)
export const updateHomework = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const { title, subject, description, className, section, dueDate, status } = req.body
        const teacherId = req.user!.id

        // Check ownership
        const existing = await query('SELECT * FROM homework WHERE id = $1 AND assigned_by = $2', [id, teacherId])
        if (existing.rows.length === 0) {
            throw new AppError('Homework not found or not authorized', 404, 'NOT_FOUND')
        }

        const updates: string[] = []
        const values: any[] = []
        let paramIndex = 1

        if (title) { updates.push(`title = $${paramIndex++}`); values.push(title) }
        if (subject) { updates.push(`subject = $${paramIndex++}`); values.push(subject) }
        if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description) }
        if (className) { updates.push(`class_name = $${paramIndex++}`); values.push(className) }
        if (section !== undefined) { updates.push(`section = $${paramIndex++}`); values.push(section) }
        if (dueDate) { updates.push(`due_date = $${paramIndex++}`); values.push(dueDate) }
        if (status) { updates.push(`status = $${paramIndex++}`); values.push(status) }

        if (updates.length === 0) {
            throw new AppError('No fields to update', 400, 'NO_UPDATES')
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`)
        values.push(id)

        const result = await query(
            `UPDATE homework SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        )

        res.json(result.rows[0])
    } catch (error) {
        next(error)
    }
}

// Delete homework (Teacher)
export const deleteHomework = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const teacherId = req.user!.id

        const result = await query(
            'DELETE FROM homework WHERE id = $1 AND assigned_by = $2 RETURNING id',
            [id, teacherId]
        )

        if (result.rows.length === 0) {
            throw new AppError('Homework not found or not authorized', 404, 'NOT_FOUND')
        }

        res.json({ message: 'Homework deleted successfully', id })
    } catch (error) {
        next(error)
    }
}

// ============================================
// STUDENT ENDPOINTS
// ============================================

// Get homework for student's class
export const getStudentHomework = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const studentId = req.user!.id

        // Get student's class info
        const studentInfo = await query(
            'SELECT grade_level, section FROM users WHERE id = $1',
            [studentId]
        )

        if (studentInfo.rows.length === 0) {
            throw new AppError('Student not found', 404, 'NOT_FOUND')
        }

        const { grade_level, section } = studentInfo.rows[0]

        // Get homework for student's class
        const homeworkResult = await query(
            `SELECT h.*, u.name as assigned_by_name,
              CASE 
                WHEN hs.status IS NOT NULL THEN hs.status
                WHEN h.due_date < CURRENT_DATE THEN 'overdue'
                ELSE 'pending'
              END as student_status,
              hs.submitted_at
       FROM homework h
       LEFT JOIN users u ON h.assigned_by = u.id
       LEFT JOIN homework_submissions hs ON h.id = hs.homework_id AND hs.student_id = $1
       WHERE h.class_name = $2 
         AND (h.section IS NULL OR h.section = $3)
         AND h.status = 'active'
       ORDER BY h.due_date ASC`,
            [studentId, grade_level, section]
        )

        res.json(homeworkResult.rows)
    } catch (error) {
        next(error)
    }
}

// Submit homework (mark as done)
export const submitHomework = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const studentId = req.user!.id

        // Check if homework exists
        const homework = await query('SELECT * FROM homework WHERE id = $1', [id])
        if (homework.rows.length === 0) {
            throw new AppError('Homework not found', 404, 'NOT_FOUND')
        }

        const isLate = new Date(homework.rows[0].due_date) < new Date()
        const status = isLate ? 'late' : 'submitted'

        // Upsert submission
        const result = await query(
            `INSERT INTO homework_submissions (homework_id, student_id, status, submitted_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (homework_id, student_id) 
       DO UPDATE SET status = $3, submitted_at = CURRENT_TIMESTAMP
       RETURNING *`,
            [id, studentId, status]
        )

        res.json({
            message: isLate ? 'Homework submitted (late)' : 'Homework submitted successfully',
            submission: result.rows[0]
        })
    } catch (error) {
        next(error)
    }
}
