import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getStats,
  getTeacherContent,
} from '../controllers/admin.controller'

const router = Router()

// All admin routes require authentication and admin role
router.use(authenticate)
router.use(authorize('admin'))

// User management
router.post('/users', createUser)
router.get('/users', getAllUsers)
router.get('/users/:id', getUserById)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

// Statistics
router.get('/stats', getStats)

// Teacher content view
router.get('/teacher-content', getTeacherContent)

export default router
