import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth'
import * as homeworkController from '../controllers/homework.controller'

const router = Router()

// ============================================
// TEACHER ROUTES
// ============================================
router.post(
    '/teacher/homework',
    authenticate,
    authorize('teacher', 'admin'),
    [
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('subject').trim().notEmpty().withMessage('Subject is required'),
        body('className').trim().notEmpty().withMessage('Class is required'),
        body('dueDate').isISO8601().withMessage('Valid due date is required'),
    ],
    homeworkController.assignHomework
)

router.get(
    '/teacher/homework',
    authenticate,
    authorize('teacher', 'admin'),
    homeworkController.getTeacherHomework
)

router.put(
    '/teacher/homework/:id',
    authenticate,
    authorize('teacher', 'admin'),
    homeworkController.updateHomework
)

router.delete(
    '/teacher/homework/:id',
    authenticate,
    authorize('teacher', 'admin'),
    homeworkController.deleteHomework
)

// ============================================
// STUDENT ROUTES
// ============================================
router.get(
    '/student/homework',
    authenticate,
    authorize('student'),
    homeworkController.getStudentHomework
)

router.put(
    '/student/homework/:id/submit',
    authenticate,
    authorize('student'),
    homeworkController.submitHomework
)

export default router
