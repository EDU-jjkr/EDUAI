import { Response, NextFunction } from 'express'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import logger from '../utils/logger'

// ============================================
// TEACHER ENDPOINTS
// ============================================

// Upload study material (metadata only - actual file upload would use multer/S3)
export const uploadMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { name, fileType, subject, fileUrl, fileSize, className, section, description } = req.body
        const teacherId = req.user!.id
        const schoolId = req.user!.school_id

        if (!name || !fileType || !subject || !fileUrl || !className) {
            throw new AppError('name, fileType, subject, fileUrl, and className are required', 400, 'MISSING_FIELDS')
        }

        const validTypes = ['pdf', 'doc', 'image', 'video', 'other']
        if (!validTypes.includes(fileType)) {
            throw new AppError(`fileType must be one of: ${validTypes.join(', ')}`, 400, 'INVALID_FILE_TYPE')
        }

        const result = await query(
            `INSERT INTO study_materials (name, file_type, subject, file_url, file_size, class_name, section, description, school_id, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
            [name, fileType, subject, fileUrl, fileSize || null, className, section || null, description || null, schoolId, teacherId]
        )

        logger.info(`Study material uploaded: ${name} by teacher ${teacherId}`)

        res.status(201).json({
            message: 'Study material uploaded successfully',
            material: result.rows[0]
        })
    } catch (error) {
        next(error)
    }
}

// Get teacher's uploaded materials
export const getTeacherMaterials = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const teacherId = req.user!.id
        const { subject, className, fileType } = req.query

        let whereClause = 'WHERE uploaded_by = $1'
        const params: any[] = [teacherId]
        let paramIndex = 2

        if (subject) {
            whereClause += ` AND subject = $${paramIndex}`
            params.push(subject)
            paramIndex++
        }

        if (className) {
            whereClause += ` AND class_name = $${paramIndex}`
            params.push(className)
            paramIndex++
        }

        if (fileType) {
            whereClause += ` AND file_type = $${paramIndex}`
            params.push(fileType)
            paramIndex++
        }

        const result = await query(
            `SELECT sm.*, u.name as uploaded_by_name
       FROM study_materials sm
       LEFT JOIN users u ON sm.uploaded_by = u.id
       ${whereClause}
       ORDER BY sm.created_at DESC`,
            params
        )

        res.json(result.rows)
    } catch (error) {
        next(error)
    }
}

// Update material
export const updateMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const { name, subject, className, section, description } = req.body
        const teacherId = req.user!.id

        // Check ownership
        const existing = await query('SELECT * FROM study_materials WHERE id = $1 AND uploaded_by = $2', [id, teacherId])
        if (existing.rows.length === 0) {
            throw new AppError('Material not found or not authorized', 404, 'NOT_FOUND')
        }

        const updates: string[] = []
        const values: any[] = []
        let paramIndex = 1

        if (name) { updates.push(`name = $${paramIndex++}`); values.push(name) }
        if (subject) { updates.push(`subject = $${paramIndex++}`); values.push(subject) }
        if (className) { updates.push(`class_name = $${paramIndex++}`); values.push(className) }
        if (section !== undefined) { updates.push(`section = $${paramIndex++}`); values.push(section) }
        if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description) }

        if (updates.length === 0) {
            throw new AppError('No fields to update', 400, 'NO_UPDATES')
        }

        values.push(id)

        const result = await query(
            `UPDATE study_materials SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
        )

        res.json(result.rows[0])
    } catch (error) {
        next(error)
    }
}

// Delete material
export const deleteMaterial = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const teacherId = req.user!.id

        const result = await query(
            'DELETE FROM study_materials WHERE id = $1 AND uploaded_by = $2 RETURNING id, name',
            [id, teacherId]
        )

        if (result.rows.length === 0) {
            throw new AppError('Material not found or not authorized', 404, 'NOT_FOUND')
        }

        res.json({ message: 'Material deleted successfully', ...result.rows[0] })
    } catch (error) {
        next(error)
    }
}

// ============================================
// STUDENT ENDPOINTS
// ============================================

// Get materials for student's class
export const getStudentMaterials = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const studentId = req.user!.id
        const { subject, fileType } = req.query

        // Get student's class info
        const studentInfo = await query(
            'SELECT grade_level, section FROM users WHERE id = $1',
            [studentId]
        )

        if (studentInfo.rows.length === 0) {
            throw new AppError('Student not found', 404, 'NOT_FOUND')
        }

        const { grade_level, section } = studentInfo.rows[0]

        let whereClause = `WHERE class_name = $1 AND (section IS NULL OR section = $2)`
        const params: any[] = [grade_level, section]
        let paramIndex = 3

        if (subject) {
            whereClause += ` AND subject = $${paramIndex}`
            params.push(subject)
            paramIndex++
        }

        if (fileType) {
            whereClause += ` AND file_type = $${paramIndex}`
            params.push(fileType)
            paramIndex++
        }

        const result = await query(
            `SELECT sm.id, sm.name, sm.file_type, sm.subject, sm.file_url, sm.file_size, 
              sm.description, sm.created_at, u.name as uploaded_by_name
       FROM study_materials sm
       LEFT JOIN users u ON sm.uploaded_by = u.id
       ${whereClause}
       ORDER BY sm.created_at DESC`,
            params
        )

        res.json(result.rows)
    } catch (error) {
        next(error)
    }
}
