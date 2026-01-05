import { Response, NextFunction } from 'express'
import { query } from '../config/database'
import { AppError } from '../middleware/error-handler'
import type { AuthRequest } from '../middleware/auth'
import logger from '../utils/logger'

// Helper to create notifications for target users
async function createNotificationsForAnnouncement(announcement: any) {
    try {
        let targetUsers: string[] = []

        if (announcement.target_audience === 'all') {
            const result = await query(
                `SELECT id FROM users WHERE school_id = $1 AND status = 'active'`,
                [announcement.school_id]
            )
            targetUsers = result.rows.map(row => row.id)
        } else if (announcement.target_audience === 'students') {
            const result = await query(
                `SELECT id FROM users WHERE school_id = $1 AND role = 'student' AND status = 'active'`,
                [announcement.school_id]
            )
            targetUsers = result.rows.map(row => row.id)
        } else if (announcement.target_audience === 'teachers') {
            const result = await query(
                `SELECT id FROM users WHERE school_id = $1 AND role = 'teacher' AND status = 'active'`,
                [announcement.school_id]
            )
            targetUsers = result.rows.map(row => row.id)
        } else if (announcement.target_audience === 'class_specific') {
            const result = await query(
                `SELECT id FROM users 
         WHERE school_id = $1 AND role = 'student' AND status = 'active'
         AND grade_level = $2 AND (section IS NULL OR section = $3 OR $3 IS NULL)`,
                [announcement.school_id, announcement.class_name, announcement.section]
            )
            targetUsers = result.rows.map(row => row.id)
        }

        // Create notifications for all target users
        for (const userId of targetUsers) {
            await query(
                `INSERT INTO notifications (user_id, title, message, notification_type, reference_id, reference_type)
         VALUES ($1, $2, $3, 'announcement', $4, 'announcement')`,
                [userId, announcement.title, announcement.content, announcement.id]
            )
        }

        logger.info(`Created ${targetUsers.length} notifications for announcement ${announcement.id}`)
    } catch (error) {
        logger.error('Error creating notifications for announcement:', error)
    }
}

// Create announcement (Teacher/Admin)
export const createAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { title, content, targetAudience, className, section, expiresAt } = req.body
        const userId = req.user!.id
        const schoolId = req.user!.school_id

        if (!title || !content || !targetAudience) {
            throw new AppError('Title, content, and targetAudience are required', 400, 'MISSING_FIELDS')
        }

        if (targetAudience === 'class_specific' && !className) {
            throw new AppError('className is required for class-specific announcements', 400, 'MISSING_CLASS')
        }

        const result = await query(
            `INSERT INTO announcements (title, content, target_audience, class_name, section, created_by, school_id, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
            [title, content, targetAudience, className || null, section || null, userId, schoolId, expiresAt || null]
        )

        const announcement = result.rows[0]

        // Create notifications for target users
        await createNotificationsForAnnouncement(announcement)

        logger.info(`Announcement created: ${title} by user ${userId}`)

        res.status(201).json({
            message: 'Announcement created successfully',
            announcement
        })
    } catch (error) {
        next(error)
    }
}

// Get announcements (filtered by user role and target)
export const getAnnouncements = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id
        const userRole = req.user!.role
        const schoolId = req.user!.school_id
        const { page = 1, limit = 20 } = req.query
        const offset = (Number(page) - 1) * Number(limit)

        let whereClause = 'WHERE a.school_id = $1 AND a.is_active = true'
        const params: any[] = [schoolId]
        let paramIndex = 2

        // Filter expired announcements
        whereClause += ` AND (a.expires_at IS NULL OR a.expires_at > CURRENT_TIMESTAMP)`

        // Role-based filtering
        if (userRole === 'student') {
            // Get student's class info
            const studentInfo = await query('SELECT grade_level, section FROM users WHERE id = $1', [userId])
            const { grade_level, section } = studentInfo.rows[0] || {}

            whereClause += ` AND (
        a.target_audience IN ('all', 'students')
        OR (a.target_audience = 'class_specific' AND a.class_name = $${paramIndex} AND (a.section IS NULL OR a.section = $${paramIndex + 1}))
      )`
            params.push(grade_level, section)
            paramIndex += 2
        } else if (userRole === 'teacher') {
            whereClause += ` AND a.target_audience IN ('all', 'teachers')`
        }
        // Admins see everything

        const result = await query(
            `SELECT a.*, u.name as created_by_name
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        )

        res.json(result.rows)
    } catch (error) {
        next(error)
    }
}

// Delete announcement (Admin only)
export const deleteAnnouncement = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const schoolId = req.user!.school_id

        // Delete the announcement
        const result = await query(
            'DELETE FROM announcements WHERE id = $1 AND school_id = $2 RETURNING id',
            [id, schoolId]
        )

        if (result.rows.length === 0) {
            throw new AppError('Announcement not found', 404, 'NOT_FOUND')
        }

        // Delete related notifications
        await query(
            "DELETE FROM notifications WHERE reference_id = $1 AND reference_type = 'announcement'",
            [id]
        )

        res.json({ message: 'Announcement deleted successfully' })
    } catch (error) {
        next(error)
    }
}

// ============================================
// NOTIFICATIONS
// ============================================

// Get user's notifications
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id
        const { isRead, type, page = 1, limit = 20 } = req.query
        const offset = (Number(page) - 1) * Number(limit)

        let whereClause = 'WHERE user_id = $1'
        const params: any[] = [userId]
        let paramIndex = 2

        if (isRead !== undefined) {
            whereClause += ` AND is_read = $${paramIndex}`
            params.push(isRead === 'true')
            paramIndex++
        }

        if (type) {
            whereClause += ` AND notification_type = $${paramIndex}`
            params.push(type)
            paramIndex++
        }

        const result = await query(
            `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        )

        res.json(result.rows)
    } catch (error) {
        next(error)
    }
}

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params
        const userId = req.user!.id

        const result = await query(
            'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        )

        if (result.rows.length === 0) {
            throw new AppError('Notification not found', 404, 'NOT_FOUND')
        }

        res.json({ message: 'Notification marked as read' })
    } catch (error) {
        next(error)
    }
}

// Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id

        await query(
            'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
            [userId]
        )

        res.json({ message: 'All notifications marked as read' })
    } catch (error) {
        next(error)
    }
}

// Get unread notifications count
export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.id

        const result = await query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
            [userId]
        )

        res.json({ unreadCount: parseInt(result.rows[0].count) })
    } catch (error) {
        next(error)
    }
}
