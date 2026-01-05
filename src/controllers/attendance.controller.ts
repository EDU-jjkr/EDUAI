import { Response, NextFunction } from 'express'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'

// ============================================
// TEACHER ENDPOINTS
// ============================================

// Get students for teacher's assigned class
export const getMyStudents = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const teacherId = req.user!.id

        // Get teacher's assigned class
        const teacherResult = await query(
            'SELECT class_teacher_of, assigned_section FROM users WHERE id = $1',
            [teacherId]
        )

        const teacher = teacherResult.rows[0]
        if (!teacher.class_teacher_of || !teacher.assigned_section) {
            throw new AppError('You are not assigned as a class teacher', 400, 'NOT_CLASS_TEACHER')
        }

        // Get all students in that class/section
        const studentsResult = await query(
            `SELECT id, name, email, section, grade_level 
       FROM users 
       WHERE role = 'student' 
       AND grade_level = $1 
       AND section = $2
       ORDER BY name`,
            [teacher.class_teacher_of, teacher.assigned_section]
        )

        res.json({
            class: teacher.class_teacher_of,
            section: teacher.assigned_section,
            students: studentsResult.rows
        })
    } catch (error) {
        next(error)
    }
}

// Mark attendance for students
export const markAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const teacherId = req.user!.id
        const { date, attendance } = req.body

        if (!date || !attendance || !Array.isArray(attendance)) {
            throw new AppError('Date and attendance array are required', 400, 'INVALID_INPUT')
        }

        // Validate date is not in future
        const today = new Date().toISOString().split('T')[0]
        if (date > today) {
            throw new AppError('Cannot mark attendance for future dates', 400, 'FUTURE_DATE')
        }

        // Get teacher's class info
        const teacherResult = await query(
            'SELECT class_teacher_of, assigned_section FROM users WHERE id = $1',
            [teacherId]
        )
        const teacher = teacherResult.rows[0]

        // Insert/Update attendance records
        let presentCount = 0
        let absentCount = 0

        for (const record of attendance) {
            const { studentId, status } = record

            if (!['present', 'absent'].includes(status)) {
                throw new AppError(`Invalid status: ${status}`, 400, 'INVALID_STATUS')
            }

            // Upsert attendance record
            await query(
                `INSERT INTO attendance (student_id, teacher_id, class, section, date, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (student_id, date) 
         DO UPDATE SET status = $6, teacher_id = $2, marked_at = NOW()`,
                [studentId, teacherId, teacher.class_teacher_of, teacher.assigned_section, date, status]
            )

            if (status === 'present') presentCount++
            else absentCount++
        }

        res.json({
            message: 'Attendance marked successfully',
            summary: {
                total: attendance.length,
                present: presentCount,
                absent: absentCount,
                date
            }
        })
    } catch (error) {
        next(error)
    }
}

// Get all classes (for viewing any class attendance)
export const getAllClasses = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const classesResult = await query(
            `SELECT DISTINCT grade_level as class, section, COUNT(*) as total_students
       FROM users 
       WHERE role = 'student' AND grade_level IS NOT NULL AND section IS NOT NULL
       GROUP BY grade_level, section
       ORDER BY grade_level, section`
        )

        res.json({
            classes: classesResult.rows
        })
    } catch (error) {
        next(error)
    }
}

// View attendance for any class (teachers can view all classes)
export const getClassAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { date, class: className, section } = req.query

        if (!date) {
            throw new AppError('Date is required', 400, 'DATE_REQUIRED')
        }

        let whereClause = 'WHERE a.date = $1'
        const params: any[] = [date]
        let paramIndex = 2

        if (className) {
            whereClause += ` AND a.class = $${paramIndex}`
            params.push(className)
            paramIndex++
        }

        if (section) {
            whereClause += ` AND a.section = $${paramIndex}`
            params.push(section)
            paramIndex++
        }

        const result = await query(
            `SELECT 
        a.id, a.student_id, a.class, a.section, a.date, a.status, a.marked_at,
        u.name as student_name, u.email as student_email
       FROM attendance a
       JOIN users u ON a.student_id = u.id
       ${whereClause}
       ORDER BY a.class, a.section, u.name`,
            params
        )

        res.json({
            date,
            class: className,
            section,
            records: result.rows
        })
    } catch (error) {
        next(error)
    }
}

// ============================================
// ADMIN ENDPOINTS
// ============================================

// Get attendance overview (class-wise summary)
export const getAttendanceOverview = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { date } = req.query
        const targetDate = date || new Date().toISOString().split('T')[0]

        const result = await query(
            `SELECT 
        a.class,
        a.section,
        COUNT(*) as total_students,
        COUNT(*) FILTER (WHERE a.status = 'present') as present_count,
        COUNT(*) FILTER (WHERE a.status = 'absent') as absent_count,
        ROUND(
          (COUNT(*) FILTER (WHERE a.status = 'present')::DECIMAL / COUNT(*)) * 100,
          2
        ) as attendance_percentage
       FROM attendance a
       WHERE a.date = $1
       GROUP BY a.class, a.section
       ORDER BY a.class, a.section`,
            [targetDate]
        )

        res.json({
            date: targetDate,
            classes: result.rows
        })
    } catch (error) {
        next(error)
    }
}

// Get detailed attendance for specific class/section/date
export const getDetailedAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { class: className, section, date } = req.params

        const result = await query(
            `SELECT 
        a.id, a.student_id, a.status, a.marked_at,
        u.name as student_name, u.email as student_email, u.section
       FROM attendance a
       JOIN users u ON a.student_id = u.id
       WHERE a.class = $1 AND a.section = $2 AND a.date = $3
       ORDER BY u.name`,
            [className, section, date]
        )

        const presentStudents = result.rows.filter(r => r.status === 'present')
        const absentStudents = result.rows.filter(r => r.status === 'absent')

        res.json({
            class: className,
            section,
            date,
            total: result.rows.length,
            presentCount: presentStudents.length,
            absentCount: absentStudents.length,
            records: result.rows,  // Add this for frontend
            presentStudents,
            absentStudents
        })
    } catch (error) {
        next(error)
    }
}

// Get teacher presence
export const getTeacherPresence = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { date } = req.query
        const targetDate = date || new Date().toISOString().split('T')[0]

        const result = await query(
            `SELECT 
        ta.id, ta.teacher_id, ta.status, ta.marked_at,
        u.name as teacher_name, u.email as teacher_email, u.class_teacher_of
       FROM teacher_attendance ta
       JOIN users u ON ta.teacher_id = u.id
       WHERE ta.date = $1
       ORDER BY u.name`,
            [targetDate]
        )

        const presentTeachers = result.rows.filter(r => r.status === 'present')
        const absentTeachers = result.rows.filter(r => r.status === 'absent')

        // Get total teachers count
        const totalResult = await query(
            `SELECT COUNT(*) as total FROM users WHERE role = 'teacher'`
        )

        res.json({
            date: targetDate,
            totalTeachers: parseInt(totalResult.rows[0].total),
            presentCount: presentTeachers.length,
            absentCount: absentTeachers.length,
            presentTeachers,
            absentTeachers
        })
    } catch (error) {
        next(error)
    }
}

// Get monthly attendance summary
export const getMonthlyAttendanceSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { month, studentId, class: className, section } = req.query

        if (!month) {
            throw new AppError('Month is required (format: YYYY-MM)', 400, 'MONTH_REQUIRED')
        }

        // Validate month format
        const monthRegex = /^\d{4}-\d{2}$/
        if (!monthRegex.test(month as string)) {
            throw new AppError('Invalid month format. Use YYYY-MM', 400, 'INVALID_MONTH_FORMAT')
        }

        // Build query based on filters
        let whereClause = 'WHERE date >= $1 AND date < $2'
        const startDate = `${month}-01`
        const endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 1)
        const endDateStr = endDate.toISOString().split('T')[0]

        const params: any[] = [startDate, endDateStr]
        let paramIndex = 3

        if (studentId) {
            whereClause += ` AND student_id = $${paramIndex}`
            params.push(studentId)
            paramIndex++
        }

        if (className) {
            whereClause += ` AND class = $${paramIndex}`
            params.push(className)
            paramIndex++
        }

        if (section) {
            whereClause += ` AND section = $${paramIndex}`
            params.push(section)
            paramIndex++
        }

        // Get monthly summary
        const result = await query(
            `SELECT 
                COUNT(DISTINCT date) as total_working_days,
                COUNT(*) FILTER (WHERE status = 'present') as present_days,
                COUNT(*) FILTER (WHERE status = 'absent') as absent_days,
                COUNT(*) FILTER (WHERE status = 'late') as late_days,
                MIN(date) as first_day,
                MAX(date) as last_day
            FROM attendance
            ${whereClause}`,
            params
        )

        const summary = result.rows[0]
        const totalWorkingDays = parseInt(summary.total_working_days) || 0
        const presentDays = parseInt(summary.present_days) || 0
        const absentDays = parseInt(summary.absent_days) || 0
        const lateDays = parseInt(summary.late_days) || 0

        // Calculate percentage (present + late are considered attended)
        const attendedDays = presentDays + lateDays
        const attendancePercentage = totalWorkingDays > 0
            ? ((attendedDays / totalWorkingDays) * 100).toFixed(2)
            : 0

        // Get daily records for the month
        const dailyRecords = await query(
            `SELECT date, status, marked_at
            FROM attendance
            ${whereClause}
            ORDER BY date DESC`,
            params
        )

        res.json({
            month,
            studentId,
            class: className,
            section,
            summary: {
                totalWorkingDays,
                presentDays,
                absentDays,
                lateDays,
                attendancePercentage: parseFloat(attendancePercentage as string),
                firstDay: summary.first_day,
                lastDay: summary.last_day,
            },
            dailyRecords: dailyRecords.rows,
        })
    } catch (error) {
        next(error)
    }
}

