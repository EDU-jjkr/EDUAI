import { Router } from 'express'
import { body } from 'express-validator'
import { authenticate, authorize } from '../middleware/auth'
import * as materialsController from '../controllers/materials.controller'

const router = Router()

// ============================================
// TEACHER ROUTES
// ============================================
router.post(
    '/teacher/materials',
    authenticate,
    authorize('teacher', 'admin'),
    [
        body('name').trim().notEmpty().withMessage('File name is required'),
        body('fileType').isIn(['pdf', 'doc', 'image', 'video', 'other']).withMessage('Valid file type required'),
        body('subject').trim().notEmpty().withMessage('Subject is required'),
        body('fileUrl').trim().notEmpty().withMessage('File URL is required'),
        body('className').trim().notEmpty().withMessage('Class is required'),
    ],
    materialsController.uploadMaterial
)

router.get(
    '/teacher/materials',
    authenticate,
    authorize('teacher', 'admin'),
    materialsController.getTeacherMaterials
)

router.put(
    '/teacher/materials/:id',
    authenticate,
    authorize('teacher', 'admin'),
    materialsController.updateMaterial
)

router.delete(
    '/teacher/materials/:id',
    authenticate,
    authorize('teacher', 'admin'),
    materialsController.deleteMaterial
)

// ============================================
// STUDENT ROUTES
// ============================================
router.get(
    '/student/materials',
    authenticate,
    authorize('student'),
    materialsController.getStudentMaterials
)

export default router
