import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth'
import * as announcementsController from '../controllers/announcements.controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

// ============================================
// ANNOUNCEMENTS
// ============================================

// Create announcement (Teacher/Admin only)
router.post(
    '/announcements',
    authorize('teacher', 'admin'),
    [
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('content').trim().notEmpty().withMessage('Content is required'),
        body('targetAudience').isIn(['all', 'students', 'teachers', 'class_specific']).withMessage('Invalid target audience'),
    ],
    announcementsController.createAnnouncement
)

// Get announcements (all users, filtered by role)
router.get('/announcements', announcementsController.getAnnouncements)

// Delete announcement (Admin only)
router.delete(
    '/announcements/:id',
    authorize('admin'),
    announcementsController.deleteAnnouncement
)

// ============================================
// NOTIFICATIONS
// ============================================

// Get user's notifications
router.get('/notifications', announcementsController.getNotifications)

// Get unread count
router.get('/notifications/unread-count', announcementsController.getUnreadCount)

// Mark notification as read
router.put('/notifications/:id/read', announcementsController.markAsRead)

// Mark all notifications as read
router.put('/notifications/read-all', announcementsController.markAllAsRead)

export default router
