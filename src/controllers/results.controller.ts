import { Response, NextFunction } from 'express'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import logger from '../utils/logger'

// ============================================
// TEACHER ENDPOINTS - EXAMS
// ============================================

// Create exam
export const createExam = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { title, subject, examType, className, section, totalMarks, examDate } = req.body
        const teacherId = req.user!.id
        const schoolId = req.user!.school_id

        if (!title || !subject || !examType || !className || !totalMarks) {
            throw new AppError('Title, subject, examType, className, and totalMarks are required', 400, 'MISSING_FIELDS')
        }

        const result = await query(
            `INSERT INTO exams (title, subject, exam_type, class_name, section, total_marks, exam_date, school_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
            [title, subject, examType, className, section || null, totalMarks, examDate || null, schoolId, teacherId]
        )

        logger.info(`Exam created: ${title} by teacher ${teacherId}`)

        res.status(201).json({
            message: 'Exam created successfully',
            exam: result.rows[0]
        })
    } catch (error) {
        next(error)
    }
}

// Get exams list (Teacher)
export const getTeacherExams = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const teacherId = req.user!.id
        const { className, subject } = req.query

        let whereClause = 'WHERE created_by = $1'
        const params: any[] = [teacherId]
        let paramIndex = 2

        if (className) {
            whereClause += ` AND class_name = $${paramIndex}`
            params.push(className)
            paramIndex++
        }

        if (subject) {
            whereClause += ` AND subject = $${paramIndex}`
            params.push(subject)
            paramIndex++
        }

        const result = await query(
            `SELECT e.*, 
              (SELECT COUNT(*) FROM results r WHERE r.exam_id = e.id) as results_count
       FROM exams e
       ${whereClause}
       ORDER BY e.exam_date DESC NULLS LAST, e.created_at DESC`,
            params
        )

        res.json(result.rows)
    } catch (error) {
        next(error)
    }
}

// ============================================
// TEACHER ENDPOINTS - RESULTS
// ============================================

// Add/update student result
export const addResult = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { examId, studentId, marksObtained, remarks } = req.body
        const teacherId = req.user!.id

        if (!examId || !studentId || marksObtained === undefined) {
            throw new AppError('examId, studentId, and marksObtained are required', 400, 'MISSING_FIELDS')
        }

        // Verify exam exists and teacher owns it
        const exam = await query('SELECT * FROM exams WHERE id = $1 AND created_by = $2', [examId, teacherId])
        if (exam.rows.length === 0) {
            throw new AppError('Exam not found or not authorized', 404, 'NOT_FOUND')
        }

        if (marksObtained < 0 || marksObtained > exam.rows[0].total_marks) {
            throw new AppError(`Marks must be between 0 and ${exam.rows[0].total_marks}`, 400, 'INVALID_MARKS')
        }

        // Upsert result
        const result = await query(
            `INSERT INTO results (exam_id, student_id, marks_obtained, remarks, created_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (exam_id, student_id)
       DO UPDATE SET marks_obtained = $3, remarks = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
            [examId, studentId, marksObtained, remarks || null, teacherId]
        )

        logger.info(`Result added: exam ${examId}, student ${studentId}, marks ${marksObtained}`)

        res.json({
            message: 'Result saved successfully',
            result: result.rows[0],
            percentage: ((marksObtained / exam.rows[0].total_marks) * 100).toFixed(1)
        })
    } catch (error) {
        next(error)
    }
}

// Get all results for an exam
export const getExamResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { examId } = req.params
        const teacherId = req.user!.id

        // Verify exam exists and teacher owns it
        const exam = await query('SELECT * FROM exams WHERE id = $1 AND created_by = $2', [examId, teacherId])
        if (exam.rows.length === 0) {
            throw new AppError('Exam not found or not authorized', 404, 'NOT_FOUND')
        }

        const results = await query(
            `SELECT r.*, u.name as student_name, u.email as student_email, u.grade_level, u.section,
              ROUND((r.marks_obtained::numeric / $2) * 100, 1) as percentage
       FROM results r
       JOIN users u ON r.student_id = u.id
       WHERE r.exam_id = $1
       ORDER BY r.marks_obtained DESC`,
            [examId, exam.rows[0].total_marks]
        )

        res.json({
            exam: exam.rows[0],
            results: results.rows,
            stats: {
                totalStudents: results.rows.length,
                avgMarks: results.rows.length > 0
                    ? (results.rows.reduce((sum: number, r: any) => sum + r.marks_obtained, 0) / results.rows.length).toFixed(1)
                    : 0,
                highestMarks: results.rows.length > 0 ? Math.max(...results.rows.map((r: any) => r.marks_obtained)) : 0,
                lowestMarks: results.rows.length > 0 ? Math.min(...results.rows.map((r: any) => r.marks_obtained)) : 0
            }
        })
    } catch (error) {
        next(error)
    }
}

// Get students for result entry (students in a class)
export const getStudentsForResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { className, section } = req.query

        if (!className) {
            throw new AppError('className is required', 400, 'MISSING_FIELDS')
        }

        let whereClause = `WHERE role = 'student' AND grade_level = $1`
        const params: any[] = [className]

        if (section) {
            whereClause += ` AND section = $2`
            params.push(section)
        }

        const students = await query(
            `SELECT id, name, email, grade_level, section
       FROM users
       ${whereClause}
       ORDER BY name ASC`,
            params
        )

        res.json(students.rows)
    } catch (error) {
        next(error)
    }
}

// ============================================
// STUDENT ENDPOINTS
// ============================================

// Get student's own results
export const getStudentResults = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const studentId = req.user!.id
        const { subject, examType } = req.query

        let whereClause = 'WHERE r.student_id = $1'
        const params: any[] = [studentId]
        let paramIndex = 2

        if (subject) {
            whereClause += ` AND e.subject = $${paramIndex}`
            params.push(subject)
            paramIndex++
        }

        if (examType) {
            whereClause += ` AND e.exam_type = $${paramIndex}`
            params.push(examType)
            paramIndex++
        }

        const results = await query(
            `SELECT r.id, r.marks_obtained, r.remarks, r.created_at,
              e.id as exam_id, e.title as exam_title, e.subject, e.exam_type, 
              e.total_marks, e.exam_date,
              ROUND((r.marks_obtained::numeric / e.total_marks) * 100, 1) as percentage
       FROM results r
       JOIN exams e ON r.exam_id = e.id
       ${whereClause}
       ORDER BY e.exam_date DESC NULLS LAST, r.created_at DESC`,
            params
        )

        // Calculate overall stats
        const totalExams = results.rows.length
        const avgPercentage = totalExams > 0
            ? (results.rows.reduce((sum: number, r: any) => sum + parseFloat(r.percentage), 0) / totalExams).toFixed(1)
            : 0

        res.json({
            results: results.rows,
            summary: {
                totalExams,
                averagePercentage: avgPercentage
            }
        })
    } catch (error) {
        next(error)
    }
}
