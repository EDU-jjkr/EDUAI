import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth'
import * as resultsController from '../controllers/results.controller'

const router = Router()

// ============================================
// TEACHER ROUTES - EXAMS
// ============================================
router.post(
    '/teacher/exam',
    authenticate,
    authorize('teacher', 'admin'),
    [
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('subject').trim().notEmpty().withMessage('Subject is required'),
        body('examType').isIn(['Unit Test', 'Mid-Term', 'Final Exam', 'Quiz', 'Practical']).withMessage('Valid exam type required'),
        body('className').trim().notEmpty().withMessage('Class is required'),
        body('totalMarks').isInt({ min: 1 }).withMessage('Total marks must be positive'),
    ],
    resultsController.createExam
)

router.get(
    '/teacher/exams',
    authenticate,
    authorize('teacher', 'admin'),
    resultsController.getTeacherExams
)

router.get(
    '/teacher/students',
    authenticate,
    authorize('teacher', 'admin'),
    resultsController.getStudentsForResults
)

// ============================================
// TEACHER ROUTES - RESULTS
// ============================================
router.post(
    '/teacher/result',
    authenticate,
    authorize('teacher', 'admin'),
    [
        body('examId').isUUID().withMessage('Valid exam ID required'),
        body('studentId').isUUID().withMessage('Valid student ID required'),
        body('marksObtained').isInt({ min: 0 }).withMessage('Marks must be non-negative'),
    ],
    resultsController.addResult
)

router.get(
    '/teacher/results/:examId',
    authenticate,
    authorize('teacher', 'admin'),
    resultsController.getExamResults
)

// ============================================
// STUDENT ROUTES
// ============================================
router.get(
    '/student/results',
    authenticate,
    authorize('student'),
    resultsController.getStudentResults
)

export default router
