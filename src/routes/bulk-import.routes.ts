import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { bulkImport, downloadTemplate } from '../controllers/bulk-import.controller'

const router = Router()

// Bulk import routes require authentication and admin/staff role
router.use(authenticate)
router.use(authorize('admin'))

router.post('/bulk-import', bulkImport)
router.get('/template', downloadTemplate)

export default router
