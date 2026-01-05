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
  deleteTeacherContent,
  getClasses,
  createClass,
  assignClassTeacher,
  getAnalyticsSummary,
} from '../controllers/admin.controller'

const router = Router()

// All admin routes require authentication and admin role
router.use(authenticate)
router.use(authorize('admin'))

// Helper to safely register routes and catch undefined handlers
const safeGet = (path: string, handler: any) => {
  if (!handler) {
    console.error(`ERROR: Route handler for GET ${path} is undefined!`)
    return router.get(path, (req, res) => res.status(500).json({ error: 'Internal Server Error: Missing handler' }))
  }
  return router.get(path, handler)
}

const safePost = (path: string, handler: any) => {
  if (!handler) {
    console.error(`ERROR: Route handler for POST ${path} is undefined!`)
    return router.post(path, (req, res) => res.status(500).json({ error: 'Internal Server Error: Missing handler' }))
  }
  return router.post(path, handler)
}

const safePut = (path: string, handler: any) => {
  if (!handler) {
    console.error(`ERROR: Route handler for PUT ${path} is undefined!`)
    return router.put(path, (req, res) => res.status(500).json({ error: 'Internal Server Error: Missing handler' }))
  }
  return router.put(path, handler)
}

const safeDelete = (path: string, handler: any) => {
  if (!handler) {
    console.error(`ERROR: Route handler for DELETE ${path} is undefined!`)
    return router.delete(path, (req, res) => res.status(500).json({ error: 'Internal Server Error: Missing handler' }))
  }
  return router.delete(path, handler)
}

// User management
safePost('/users', createUser)
safeGet('/users', getAllUsers)
// Template route must come BEFORE :id route to avoid conflict
safeGet('/users/template', (req: any, res: any) => {
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename=users_template.csv')
  res.send('email,name,role,grade_level,section\nexample@school.com,John Doe,student,10,A')
})
safeGet('/users/:id', getUserById)
safePut('/users/:id', updateUser)
safeDelete('/users/:id', deleteUser)

// Statistics
safeGet('/stats', getStats)

// Restricted Analytics (Future release)
safeGet('/analytics/summary', getAnalyticsSummary)
safeGet('/analytics/usage', (req: any, res: any) => res.status(403).json({ error: 'Usage analytics are currently disabled. Please contact the administrator.' }))
safeGet('/analytics/popular-topics', (req: any, res: any) => res.status(403).json({ error: 'Topic analytics are currently disabled. Please contact the administrator.' }))
safeGet('/analytics/ai-costs', (req: any, res: any) => res.status(403).json({ error: 'AI cost tracking is currently disabled. Please contact the administrator.' }))

// Teacher content view
safeGet('/teacher-content', getTeacherContent)
router.delete('/teacher-content/:contentType/:id', deleteTeacherContent)

// Class management
safeGet('/classes', getClasses)
safePost('/classes', createClass)
safePut('/classes/assign-teacher', assignClassTeacher)

export default router
