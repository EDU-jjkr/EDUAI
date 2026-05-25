import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { scopeToSchool } from '../middleware/tenant'
import {
  createSchool,
  listSchools,
  getSchool,
  updateSchool,
  deleteSchool,
  toggleSchoolStatus,
  getPlatformStats,
  createSchoolAdmin,
  listAllUsers,
  registerSchool,
  getSchoolBySubdomain
} from '../controllers/super-admin.controller'

const router = Router()

// ─── Public endpoints (no auth) ───────────────────────────────────
// Self-service school registration
router.post('/register', registerSchool)

// School lookup by subdomain (for login page branding)
router.get('/by-subdomain/:subdomain', getSchoolBySubdomain)

// ─── Super-Admin only endpoints ───────────────────────────────────
const superAdminOnly = [authenticate, authorize('super_admin')]

// Platform statistics dashboard
router.get('/stats', ...superAdminOnly, getPlatformStats)

// School management (tenant CRUD)
router.post('/schools', ...superAdminOnly, createSchool)
router.get('/schools', ...superAdminOnly, listSchools)
router.get('/schools/:id', ...superAdminOnly, getSchool)
router.put('/schools/:id', ...superAdminOnly, updateSchool)
router.delete('/schools/:id', ...superAdminOnly, deleteSchool)
router.patch('/schools/:id/status', ...superAdminOnly, toggleSchoolStatus)

// User management (global across all tenants)
router.post('/schools/:id/admins', ...superAdminOnly, createSchoolAdmin)
router.get('/users', ...superAdminOnly, listAllUsers)

export default router
