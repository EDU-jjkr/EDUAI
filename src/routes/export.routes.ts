import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import * as exportController from '../controllers/export.controller'

const router = Router()

router.use(authenticate)

router.post('/powerpoint', exportController.exportToPowerPoint)
router.post('/pdf', exportController.exportToPDF)

export default router
